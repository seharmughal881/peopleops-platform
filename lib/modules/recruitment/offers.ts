'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/client'
import { requirePermission } from '@/lib/modules/auth'
import { recordAudit } from '@/lib/modules/audit'
import { CreateOfferSchema } from './schemas'

export async function createOffer(formData: FormData) {
  const actor = await requirePermission('hiring:write')

  const parsed = CreateOfferSchema.safeParse({
    candidateId: formData.get('candidateId'),
    salary: formData.get('salary'),
    currency: (formData.get('currency') as string) || 'USD',
    startDate: formData.get('startDate'),
    notes: formData.get('notes') || undefined,
  })
  if (!parsed.success) return { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors }

  const existing = await prisma.offer.findUnique({ where: { candidateId: parsed.data.candidateId } })
  if (existing) return { error: 'Candidate already has an offer' }

  const offer = await prisma.offer.create({ data: parsed.data })
  await prisma.candidate.update({ where: { id: parsed.data.candidateId }, data: { stage: 'offer' } })

  await recordAudit({
    userId: actor.id,
    action: 'offer.created',
    entityType: 'Offer',
    entityId: offer.id,
    after: { salary: offer.salary, candidateId: offer.candidateId },
  })

  revalidatePath(`/admin/recruitment/candidates/${parsed.data.candidateId}`)
  return { ok: true }
}

export async function setOfferStatus(formData: FormData) {
  const actor = await requirePermission('hiring:write')
  const id = String(formData.get('id') || '')
  const status = String(formData.get('status') || '')
  if (!['sent', 'accepted', 'declined', 'withdrawn'].includes(status)) return { error: 'Invalid status' }

  const data: any = { status }
  if (status === 'sent') data.sentAt = new Date()
  if (['accepted', 'declined', 'withdrawn'].includes(status)) data.decidedAt = new Date()

  const offer = await prisma.offer.update({ where: { id }, data })

  if (status === 'accepted') {
    await prisma.candidate.update({ where: { id: offer.candidateId }, data: { stage: 'hired' } })
  } else if (status === 'declined' || status === 'withdrawn') {
    await prisma.candidate.update({ where: { id: offer.candidateId }, data: { stage: 'rejected' } })
  }

  await recordAudit({
    userId: actor.id,
    action: `offer.${status}`,
    entityType: 'Offer',
    entityId: offer.id,
  })

  revalidatePath(`/admin/recruitment/candidates/${offer.candidateId}`)
  return { ok: true }
}
