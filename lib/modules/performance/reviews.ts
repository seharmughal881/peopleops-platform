'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/client'
import { requireUser, requirePermission } from '@/lib/modules/auth'
import { recordAudit } from '@/lib/modules/audit'
import { notify } from '@/lib/modules/notifications'
import { CreateCycleSchema, InitiateReviewSchema, Initiate360Schema, SubmitReviewSchema } from './schemas'

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

// State machine: draft → active → closed. `closed` is terminal; reopening a
// closed cycle would create orphaned reviews and skew historical reports.
const CYCLE_TRANSITIONS: Record<string, readonly string[]> = {
  draft: ['active'],
  active: ['closed'],
  closed: [],
}

export async function setCycleStatus(formData: FormData) {
  const actor = await requirePermission('employee:read')
  const id = String(formData.get('id') || '')
  const status = String(formData.get('status') || '')
  if (!['draft', 'active', 'closed'].includes(status)) return { error: 'Invalid status' }
  if (!id) return { error: 'Missing id' }

  const existing = await prisma.reviewCycle.findUnique({ where: { id }, select: { status: true } })
  if (!existing) return { error: 'Cycle not found' }

  const allowed = CYCLE_TRANSITIONS[existing.status] ?? []
  if (existing.status !== status && !allowed.includes(status)) {
    return { error: `Cannot transition cycle from ${existing.status} to ${status}` }
  }

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

export async function initiate360Review(formData: FormData) {
  const actor = await requirePermission('employee:read')

  const peerIds = formData.getAll('peerIds').map((v) => String(v)).filter(Boolean)
  const upwardReviewerIds = formData.getAll('upwardReviewerIds').map((v) => String(v)).filter(Boolean)
  const parsed = Initiate360Schema.safeParse({
    cycleId: formData.get('cycleId'),
    subjectId: formData.get('subjectId'),
    peerIds,
    upwardReviewerIds,
    includeSelf: formData.get('includeSelf') ?? 'true',
    includeManager: formData.get('includeManager') ?? 'true',
  })
  if (!parsed.success) return { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors }
  const { cycleId, subjectId, includeSelf, includeManager } = parsed.data

  const cycle = await prisma.reviewCycle.findUnique({ where: { id: cycleId } })
  if (!cycle || cycle.status !== 'active') return { error: 'Cycle is not active' }

  const subject = await prisma.employee.findUnique({
    where: { id: subjectId },
    select: { id: true, managerId: true, firstName: true, lastName: true },
  })
  if (!subject) return { error: 'Subject not found' }

  type ReviewPlan = { reviewerId: string; type: 'self' | 'manager' | 'peer' | 'upward' }
  const plan: ReviewPlan[] = []
  if (includeSelf) plan.push({ reviewerId: subjectId, type: 'self' })
  if (includeManager && subject.managerId) plan.push({ reviewerId: subject.managerId, type: 'manager' })
  for (const pid of parsed.data.peerIds) {
    if (pid !== subjectId) plan.push({ reviewerId: pid, type: 'peer' })
  }
  for (const uid of parsed.data.upwardReviewerIds) {
    if (uid !== subjectId) plan.push({ reviewerId: uid, type: 'upward' })
  }

  const created = await prisma.review.createMany({
    data: plan.map((p) => ({ cycleId, subjectId, reviewerId: p.reviewerId, type: p.type })),
    skipDuplicates: true,
  })

  const reviewerIds = Array.from(new Set(plan.map((p) => p.reviewerId)))
  const reviewers = await prisma.employee.findMany({
    where: { id: { in: reviewerIds } },
    select: { id: true, user: { select: { id: true } } },
  })
  for (const r of reviewers) {
    if (r.user) {
      await notify({
        userId: r.user.id,
        title: `360 review assigned: ${cycle.name}`,
        body: `Please complete your review for ${subject.firstName} ${subject.lastName}.`,
        link: '/performance',
      })
    }
  }

  await recordAudit({
    userId: actor.id,
    action: 'review.360.initiated',
    entityType: 'Review',
    entityId: subjectId,
    after: { cycleId, subjectId, created: created.count, requested: plan.length },
  })

  revalidatePath('/manager/performance')
  revalidatePath('/admin/performance')
  return { ok: true, created: created.count, requested: plan.length }
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
