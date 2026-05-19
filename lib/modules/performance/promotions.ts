'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/db/client'
import { requireUser, requirePermission } from '@/lib/modules/auth'
import { recordAudit } from '@/lib/modules/audit'
import { notify } from '@/lib/modules/notifications'

const RecommendSchema = z.object({
  subjectId: z.string().min(1),
  proposedTitle: z.string().min(1).max(200),
  proposedSalary: z.coerce.number().nonnegative().optional(),
  proposedCurrency: z.string().min(3).max(3).default('USD'),
  proposedDepartmentId: z.string().optional(),
  justification: z.string().min(10).max(4000),
  basedOnReviewIds: z.array(z.string()).optional(),
})

const DecisionSchema = z.object({
  id: z.string().min(1),
  decision: z.enum(['approved', 'rejected']),
  comments: z.string().max(2000).optional(),
})

export async function recommendPromotion(formData: FormData) {
  const user = await requireUser()
  if (!user.employee) return { error: 'No employee record' }

  const reviewIdsRaw = formData.get('basedOnReviewIds')
  const reviewIds = typeof reviewIdsRaw === 'string' && reviewIdsRaw.length > 0
    ? reviewIdsRaw.split(',').map((s) => s.trim()).filter(Boolean)
    : undefined

  const parsed = RecommendSchema.safeParse({
    subjectId: formData.get('subjectId'),
    proposedTitle: formData.get('proposedTitle'),
    proposedSalary: formData.get('proposedSalary') || undefined,
    proposedCurrency: (formData.get('proposedCurrency') as string) || 'USD',
    proposedDepartmentId: formData.get('proposedDepartmentId') || undefined,
    justification: formData.get('justification'),
    basedOnReviewIds: reviewIds,
  })
  if (!parsed.success) return { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors }

  // Manager must be the subject's manager OR have employee:read permission
  const subject = await prisma.employee.findUnique({
    where: { id: parsed.data.subjectId },
    select: { managerId: true, user: { select: { id: true } } },
  })
  if (!subject) return { error: 'Subject not found' }
  const isManager = subject.managerId === user.employee.id
  const isAdmin = user.permissions.includes('*') || user.permissions.includes('employee:read')
  if (!isManager && !isAdmin) return { error: 'You can only recommend your direct reports' }

  // Block duplicate pending
  const existing = await prisma.promotionRecommendation.findFirst({
    where: { subjectId: parsed.data.subjectId, status: 'pending' },
  })
  if (existing) return { error: 'A pending recommendation already exists for this employee' }

  const rec = await prisma.promotionRecommendation.create({
    data: {
      subjectId: parsed.data.subjectId,
      recommendedById: user.employee.id,
      proposedTitle: parsed.data.proposedTitle,
      proposedSalary: parsed.data.proposedSalary,
      proposedCurrency: parsed.data.proposedCurrency,
      proposedDepartmentId: parsed.data.proposedDepartmentId,
      justification: parsed.data.justification,
      basedOnReviewIds: JSON.stringify(parsed.data.basedOnReviewIds ?? []),
    },
  })

  // Notify HR
  const hrAdminRole = await prisma.role.findUnique({ where: { name: 'hr_admin' } })
  if (hrAdminRole) {
    const hr = await prisma.userRole.findMany({ where: { roleId: hrAdminRole.id }, select: { userId: true } })
    for (const r of hr) {
      await notify({
        userId: r.userId,
        title: 'New promotion recommendation',
        body: `${parsed.data.proposedTitle} — review at /admin/performance`,
        link: '/admin/performance',
      })
    }
  }

  await recordAudit({
    userId: user.id,
    action: 'promotion.recommended',
    entityType: 'PromotionRecommendation',
    entityId: rec.id,
    after: { subjectId: rec.subjectId, proposedTitle: rec.proposedTitle },
  })

  revalidatePath('/manager/performance')
  revalidatePath('/admin/performance')
  return { ok: true, recommendationId: rec.id }
}

export async function decidePromotion(formData: FormData) {
  const actor = await requirePermission('employee:read')

  const parsed = DecisionSchema.safeParse({
    id: formData.get('id'),
    decision: formData.get('decision'),
    comments: formData.get('comments') || undefined,
  })
  if (!parsed.success) return { error: 'Validation failed' }

  const rec = await prisma.promotionRecommendation.findUnique({
    where: { id: parsed.data.id },
    include: { subject: { include: { user: true } }, recommendedBy: { include: { user: true } } },
  })
  if (!rec) return { error: 'Not found' }
  if (rec.status !== 'pending') return { error: 'Already decided' }

  const updated = await prisma.promotionRecommendation.update({
    where: { id: rec.id },
    data: {
      status: parsed.data.decision,
      decidedById: actor.id,
      decidedAt: new Date(),
      comments: parsed.data.comments,
    },
  })

  // On approval: apply changes to employee record + log salary history
  if (parsed.data.decision === 'approved') {
    await prisma.employee.update({
      where: { id: rec.subjectId },
      data: {
        jobTitle: rec.proposedTitle,
        ...(rec.proposedDepartmentId ? { departmentId: rec.proposedDepartmentId } : {}),
      },
    })
    if (rec.proposedSalary != null) {
      await prisma.salaryHistory.create({
        data: {
          employeeId: rec.subjectId,
          amount: rec.proposedSalary,
          currency: rec.proposedCurrency,
          effectiveDate: new Date(),
          reason: `Promotion: ${rec.proposedTitle}`,
        },
      })
    }
  }

  // Notify subject + recommender
  await notify({
    userId: rec.subject.user.id,
    title: `Your promotion to ${rec.proposedTitle} was ${parsed.data.decision}`,
    body: parsed.data.comments,
    link: '/performance',
  })
  await notify({
    userId: rec.recommendedBy.user.id,
    title: `Promotion recommendation ${parsed.data.decision}`,
    body: `${rec.subject.firstName} → ${rec.proposedTitle}`,
    link: '/manager/performance',
  })

  await recordAudit({
    userId: actor.id,
    action: `promotion.${parsed.data.decision}`,
    entityType: 'PromotionRecommendation',
    entityId: updated.id,
    after: { subjectId: rec.subjectId, applied: parsed.data.decision === 'approved' },
  })

  revalidatePath('/admin/performance')
  revalidatePath('/manager/performance')
  return { ok: true }
}

export async function withdrawPromotion(formData: FormData) {
  const user = await requireUser()
  if (!user.employee) return { error: 'No employee record' }

  const id = String(formData.get('id') ?? '')
  const rec = await prisma.promotionRecommendation.findUnique({ where: { id } })
  if (!rec) return { error: 'Not found' }
  if (rec.recommendedById !== user.employee.id && !user.permissions.includes('*')) {
    return { error: 'Only the recommender can withdraw' }
  }
  if (rec.status !== 'pending') return { error: 'Only pending recommendations can be withdrawn' }

  await prisma.promotionRecommendation.update({
    where: { id: rec.id },
    data: { status: 'withdrawn', decidedAt: new Date() },
  })

  await recordAudit({
    userId: user.id,
    action: 'promotion.withdrawn',
    entityType: 'PromotionRecommendation',
    entityId: rec.id,
  })

  revalidatePath('/manager/performance')
  revalidatePath('/admin/performance')
  return { ok: true }
}
