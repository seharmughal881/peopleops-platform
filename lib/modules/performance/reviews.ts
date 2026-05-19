'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/client'
import { requireUser, requirePermission } from '@/lib/modules/auth'
import { recordAudit } from '@/lib/modules/audit'
import { notify } from '@/lib/modules/notifications'
import { CreateCycleSchema, InitiateReviewSchema, SubmitReviewSchema } from './schemas'

export async function createCycle(formData: FormData) {
  const actor = await requirePermission('employee:read')
  const parsed = CreateCycleSchema.safeParse({
    name: formData.get('name'),
    startDate: formData.get('startDate'),
    endDate: formData.get('endDate'),
  })
  if (!parsed.success) return { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors }

  try {
    const cycle = await prisma.reviewCycle.create({ data: parsed.data })
    await recordAudit({
      userId: actor.id,
      action: 'reviewCycle.created',
      entityType: 'ReviewCycle',
      entityId: cycle.id,
      after: parsed.data,
    })
  } catch (e: any) {
    if (e?.code === 'P2002') return { error: 'A cycle with that name already exists' }
    throw e
  }

  revalidatePath('/admin/performance')
  return { ok: true }
}

export async function setCycleStatus(formData: FormData) {
  const actor = await requirePermission('employee:read')
  const id = String(formData.get('id') || '')
  const status = String(formData.get('status') || '')
  if (!['draft', 'active', 'closed'].includes(status)) return { error: 'Invalid status' }

  const cycle = await prisma.reviewCycle.update({ where: { id }, data: { status } })
  await recordAudit({
    userId: actor.id,
    action: `reviewCycle.${status}`,
    entityType: 'ReviewCycle',
    entityId: cycle.id,
  })
  revalidatePath('/admin/performance')
  return { ok: true }
}

export async function initiateReview(formData: FormData) {
  const user = await requireUser()
  if (!user.employee) return { error: 'No employee record' }

  const parsed = InitiateReviewSchema.safeParse({
    cycleId: formData.get('cycleId'),
    subjectId: formData.get('subjectId'),
    reviewerId: formData.get('reviewerId'),
    type: formData.get('type'),
  })
  if (!parsed.success) return { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors }

  const cycle = await prisma.reviewCycle.findUnique({ where: { id: parsed.data.cycleId } })
  if (!cycle || cycle.status !== 'active') return { error: 'Cycle is not active' }

  try {
    const review = await prisma.review.create({ data: parsed.data })
    const reviewer = await prisma.employee.findUnique({
      where: { id: parsed.data.reviewerId },
      select: { user: { select: { id: true } }, firstName: true },
    })
    if (reviewer?.user) {
      await notify({
        userId: reviewer.user.id,
        title: `Review assigned: ${cycle.name}`,
        body: `You have a ${parsed.data.type} review to complete.`,
        link: '/performance',
      })
    }
    await recordAudit({
      userId: user.id,
      action: 'review.initiated',
      entityType: 'Review',
      entityId: review.id,
      after: parsed.data,
    })
  } catch (e: any) {
    if (e?.code === 'P2002') return { error: 'A review of this type already exists for this subject + reviewer' }
    throw e
  }

  revalidatePath('/manager/performance')
  revalidatePath('/performance')
  return { ok: true }
}

export async function submitReview(formData: FormData) {
  const user = await requireUser()
  if (!user.employee) return { error: 'No employee record' }

  const parsed = SubmitReviewSchema.safeParse({
    id: formData.get('id'),
    rating: formData.get('rating'),
    strengths: formData.get('strengths') || undefined,
    growthAreas: formData.get('growthAreas') || undefined,
    comments: formData.get('comments') || undefined,
  })
  if (!parsed.success) return { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors }

  const review = await prisma.review.findUnique({
    where: { id: parsed.data.id },
    include: { subject: { include: { user: true } }, cycle: true },
  })
  if (!review) return { error: 'Not found' }
  if (review.reviewerId !== user.employee.id) return { error: 'Not your review to submit' }
  if (review.status === 'submitted') return { error: 'Already submitted' }
  if (review.cycle.status !== 'active') return { error: 'Cycle is no longer active' }

  await prisma.review.update({
    where: { id: review.id },
    data: { ...parsed.data, status: 'submitted', submittedAt: new Date() },
  })

  await notify({
    userId: review.subject.user.id,
    title: `Review submitted: ${review.cycle.name}`,
    body: 'A new review about you was submitted.',
    link: '/performance',
  })

  await recordAudit({
    userId: user.id,
    action: 'review.submitted',
    entityType: 'Review',
    entityId: review.id,
    after: { rating: parsed.data.rating, type: review.type },
  })

  revalidatePath('/performance')
  revalidatePath('/admin/performance')
  return { ok: true }
}
