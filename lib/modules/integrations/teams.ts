// Microsoft Teams Incoming Webhook integration.
// Uses the MessageCard schema (Office 365 connector format) which works for
// both classic Teams connectors and Workflows-based webhooks. The newer
// Adaptive Cards format is a possible future upgrade but is not required.

export interface TeamsMessage {
  '@type': 'MessageCard'
  '@context': 'https://schema.org/extensions'
  summary: string
  themeColor?: string // 6-char hex, no leading '#'
  title?: string
  text?: string
}

export function teamsWebhookUrl(): string | undefined {
  return process.env.TEAMS_WEBHOOK_URL
}

export function isTeamsConfigured(): boolean {
  return Boolean(teamsWebhookUrl())
}

export async function postToTeams(msg: TeamsMessage): Promise<{ ok: boolean; error?: string }> {
  const url = teamsWebhookUrl()
  if (!url) return { ok: false, error: 'TEAMS_WEBHOOK_URL not configured' }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msg),
    })
    if (!res.ok) {
      const body = await res.text()
      return { ok: false, error: `Teams ${res.status}: ${body}` }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown error' }
  }
}

export function teamsAnnouncementMessage(
  title: string,
  body: string,
  authorName?: string,
): TeamsMessage {
  const summary = authorName ? `${title} — by ${authorName}` : title
  return {
    '@type': 'MessageCard',
    '@context': 'https://schema.org/extensions',
    summary,
    themeColor: '0078D7',
    title: summary,
    text: body,
  }
}

export function teamsNotificationMessage(title: string, body?: string): TeamsMessage {
  return {
    '@type': 'MessageCard',
    '@context': 'https://schema.org/extensions',
    summary: title,
    themeColor: '2EB67D',
    title,
    text: body ?? '',
  }
}
