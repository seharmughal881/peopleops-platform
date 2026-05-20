'use server'

import { requirePermission } from '@/lib/modules/auth'
import { recordAudit } from '@/lib/modules/audit'
import { isSlackConfigured, postToSlack } from './slack'
import { isTeamsConfigured, postToTeams, teamsNotificationMessage } from './teams'

export async function sendSlackTest(): Promise<{ ok: boolean; error?: string; configured: boolean }> {
  const actor = await requirePermission('employee:read')
  const configured = isSlackConfigured()
  if (!configured) return { ok: false, configured: false, error: 'SLACK_WEBHOOK_URL is not set' }

  const result = await postToSlack({
    text: `:white_check_mark: Slack integration test from HR system (triggered by ${actor.email})`,
  })
  await recordAudit({
    userId: actor.id,
    action: 'integration.slack.test',
    entityType: 'Integration',
    entityId: 'slack',
    after: { ok: result.ok, error: result.error },
  })
  return { ...result, configured: true }
}

export async function sendTeamsTest(): Promise<{ ok: boolean; error?: string; configured: boolean }> {
  const actor = await requirePermission('employee:read')
  const configured = isTeamsConfigured()
  if (!configured) return { ok: false, configured: false, error: 'TEAMS_WEBHOOK_URL is not set' }

  const result = await postToTeams(
    teamsNotificationMessage('Teams integration test', `Triggered by ${actor.email}`),
  )
  await recordAudit({
    userId: actor.id,
    action: 'integration.teams.test',
    entityType: 'Integration',
    entityId: 'teams',
    after: { ok: result.ok, error: result.error },
  })
  return { ...result, configured: true }
}
