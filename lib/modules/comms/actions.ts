'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/db/client'
import { requirePermission } from '@/lib/modules/auth'
import { recordAudit } from '@/lib/modules/audit'
import { enqueue } from '@/lib/jobs/queue'
import { isSlackConfigured } from '@/lib/modules/integrations/slack'
import { isTeamsConfigured } from '@/lib/modules/integrations/teams'

const AnnouncementSchema = z.object({
  title: z.string().min(1).max(160),
  body: z.string().min(1).max(4000),
})

export async function createAnnouncement(formData: FormData) {
  const actor = await requirePermission('employee:read')
  const parsed = AnnouncementSchema.safeParse({
    title: formData.get('title'),
    body: formData.get('body'),
  })
  if (!parsed.success) return { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors }

  const row = await prisma.announcement.create({
    data: { ...parsed.data, authorId: actor.id },
  })

  await recordAudit({
    userId: actor.id,
    action: 'announcement.created',
    entityType: 'Announcement',
    entityId: row.id,
    after: { title: row.title },
  })

  if (isSlackConfigured()) {
    await enqueue({ kind: 'announcement.slack-broadcast', announcementId: row.id })
  }
  if (isTeamsConfigured()) {
    await enqueue({ kind: 'announcement.teams-broadcast', announcementId: row.id })
  }

  revalidatePath('/admin/announcements')
  revalidatePath('/dashboard')
  return { ok: true }
}

export async function deleteAnnouncement(formData: FormData) {
  const actor = await requirePermission('employee:read')
  const id = String(formData.get('id') || '')
  if (!id) return { error: 'Missing id' }

  await prisma.announcement.delete({ where: { id } })
  await recordAudit({
    userId: actor.id,
    action: 'announcement.deleted',
    entityType: 'Announcement',
    entityId: id,
  })
  revalidatePath('/admin/announcements')
  revalidatePath('/dashboard')
  return { ok: true }
}
