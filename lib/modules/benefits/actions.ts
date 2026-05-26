'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/client'
import { requireUser, requirePermission } from '@/lib/modules/auth'
import { recordAudit } from '@/lib/modules/audit'
import { notify } from '@/lib/modules/notifications'
import {
  PlanInputSchema,
  EnrollSchema,
  DependentSchema,
  COVERAGE_LEVELS,
} from './schemas'

function parsePlanInput(formData: FormData) {
  return PlanInputSchema.safeParse({
    name: formData.get('name'),
    type: formData.get('type'),
    description: formData.get('description') || undefined,
    monthlyPremium: formData.get('monthlyPremium'),
    employerShare: formData.get('employerShare') || 0,
    coversDependents: formData.get('coversDependents') === 'on' || formData.get('coversDependents') === 'true',
    enrollOpensAt: formData.get('enrollOpensAt') || undefined,
    enrollClosesAt: formData.get('enrollClosesAt') || undefined,
  })
}

export async function createPlan(formData: FormData) {
  const actor = await requirePermission('benefit:*')
  const parsed = parsePlanInput(formData)
  if (!parsed.success) {
    return { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors }
  }
  const plan = await prisma.benefitPlan.create({ data: parsed.data })
  await recordAudit({
    userId: actor.id,
    action: 'benefit.plan.created',
    entityType: 'BenefitPlan',
    entityId: plan.id,
    after: parsed.data,
  })
  revalidatePath('/admin/benefits')
  return { ok: true, planId: plan.id }
}

export async function updatePlan(formData: FormData) {
  const actor = await requirePermission('benefit:*')
  const id = String(formData.get('id') || '')
  const existing = await prisma.benefitPlan.findUnique({ where: { id } })
  if (!existing) return { error: 'Not found' }
  const parsed = parsePlanInput(formData)
  if (!parsed.success) {
    return { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors }
  }
  await prisma.benefitPlan.update({ where: { id }, data: parsed.data })
  await recordAudit({
    userId: actor.id,
    action: 'benefit.plan.updated',
    entityType: 'BenefitPlan',
    entityId: id,
    before: {
      name: existing.name, type: existing.type,
      monthlyPremium: existing.monthlyPremium, employerShare: existing.employerShare,
    },
    after: parsed.data,
  })
  revalidatePath('/admin/benefits')
  revalidatePath(`/admin/benefits/${id}`)
  return { ok: true }
}

export async function deletePlan(formData: FormData) {
  const actor = await requirePermission('benefit:*')
  const id = String(formData.get('id') || '')
  const force = formData.get('force') === 'true'
  const plan = await prisma.benefitPlan.findUnique({
    where: { id },
    include: { _count: { select: { enrollments: true } } },
  })
  if (!plan) return { error: 'Plan not found' }
  if (plan._count.enrollments > 0 && !force) {
    return { error: 'Cannot delete a plan with enrollments. Archive it instead.' }
  }

  let cascadedDependents = 0
  await prisma.$transaction(async (tx) => {
    if (plan._count.enrollments > 0) {
      const enrollmentIds = (
        await tx.benefitEnrollment.findMany({ where: { planId: id }, select: { id: true } })
      ).map((e) => e.id)
      if (enrollmentIds.length > 0) {
        const dep = await tx.benefitDependent.deleteMany({
          where: { enrollmentId: { in: enrollmentIds } },
        })
        cascadedDependents = dep.count
        await tx.benefitEnrollment.deleteMany({ where: { planId: id } })
      }
    }
    await tx.benefitPlan.delete({ where: { id } })
  })

  await recordAudit({
    userId: actor.id,
    action: force ? 'benefit.plan.force_deleted' : 'benefit.plan.deleted',
    entityType: 'BenefitPlan',
    entityId: id,
    before: {
      name: plan.name,
      type: plan.type,
      monthlyPremium: plan.monthlyPremium,
      employerShare: plan.employerShare,
      cascadedEnrollments: plan._count.enrollments,
      cascadedDependents,
    },
  })
  revalidatePath('/admin/benefits')
  return { ok: true }
}

export async function togglePlanActive(formData: FormData) {
  const actor = await requirePermission('benefit:*')
  const id = String(formData.get('id') || '')
  const plan = await prisma.benefitPlan.findUnique({ where: { id } })
  if (!plan) return { error: 'Not found' }
  await prisma.benefitPlan.update({ where: { id }, data: { active: !plan.active } })
  await recordAudit({
    userId: actor.id,
    action: plan.active ? 'benefit.plan.archived' : 'benefit.plan.reactivated',
    entityType: 'BenefitPlan',
    entityId: id,
  })
  revalidatePath('/admin/benefits')
  return { ok: true }
}

async function ensureEmployee() {
  const user = await requireUser()
  if (!user.employee) throw new Error('No employee record')
  return user
}

function isOpenForEnrollment(plan: { active: boolean; enrollOpensAt: Date | null; enrollClosesAt: Date | null }): boolean {
  if (!plan.active) return false
  const now = new Date()
  if (plan.enrollOpensAt && plan.enrollOpensAt > now) return false
  if (plan.enrollClosesAt && plan.enrollClosesAt < now) return false
  return true
}

export async function enroll(formData: FormData) {
  const user = await ensureEmployee()
  const parsed = EnrollSchema.safeParse({
    planId: formData.get('planId'),
    coverageLevel: formData.get('coverageLevel') || 'employee',
    effectiveFrom: formData.get('effectiveFrom') || undefined,
  })
  if (!parsed.success) return { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors }

  const plan = await prisma.benefitPlan.findUnique({ where: { id: parsed.data.planId } })
  if (!plan) return { error: 'Plan not found' }
  if (!isOpenForEnrollment(plan)) return { error: 'Enrollment is not currently open for this plan' }
  if (parsed.data.coverageLevel !== 'employee' && !plan.coversDependents) {
    return { error: 'This plan does not cover dependents' }
  }

  const effectiveFrom = parsed.data.effectiveFrom ?? new Date()

  const existing = await prisma.benefitEnrollment.findUnique({
    where: {
      employeeId_planId_effectiveFrom: {
        employeeId: user.employee!.id,
        planId: plan.id,
        effectiveFrom,
      },
    },
  })
  if (existing) return { error: 'You already have an enrollment for this plan on that date' }

  const activeExisting = await prisma.benefitEnrollment.findFirst({
    where: { employeeId: user.employee!.id, planId: plan.id, status: 'active' },
  })
  if (activeExisting) return { error: 'You already have an active enrollment in this plan' }

  const enrollment = await prisma.benefitEnrollment.create({
    data: {
      employeeId: user.employee!.id,
      planId: plan.id,
      coverageLevel: parsed.data.coverageLevel,
      effectiveFrom,
      status: 'active',
    },
  })

  await recordAudit({
    userId: user.id,
    action: 'benefit.enrolled',
    entityType: 'BenefitEnrollment',
    entityId: enrollment.id,
    after: { planId: plan.id, coverageLevel: parsed.data.coverageLevel },
  })

  revalidatePath('/benefits')
  revalidatePath(`/admin/benefits/${plan.id}`)
  return { ok: true, enrollmentId: enrollment.id }
}

export async function waivePlan(formData: FormData) {
  const user = await ensureEmployee()
  const planId = String(formData.get('planId') || '')
  const plan = await prisma.benefitPlan.findUnique({ where: { id: planId } })
  if (!plan) return { error: 'Plan not found' }

  const existing = await prisma.benefitEnrollment.findFirst({
    where: { employeeId: user.employee!.id, planId, status: { in: ['active', 'pending'] } },
  })
  if (existing) return { error: 'You have an active enrollment — terminate it first' }

  const enrollment = await prisma.benefitEnrollment.create({
    data: {
      employeeId: user.employee!.id,
      planId,
      coverageLevel: 'employee',
      effectiveFrom: new Date(),
      status: 'waived',
    },
  })
  await recordAudit({
    userId: user.id,
    action: 'benefit.waived',
    entityType: 'BenefitEnrollment',
    entityId: enrollment.id,
    after: { planId },
  })
  revalidatePath('/benefits')
  return { ok: true }
}

export async function terminateEnrollment(formData: FormData) {
  const actor = await requireUser()
  const id = String(formData.get('id') || '')
  const enrollment = await prisma.benefitEnrollment.findUnique({
    where: { id },
    include: { employee: { include: { user: true } }, plan: true },
  })
  if (!enrollment) return { error: 'Not found' }

  const isSelf = enrollment.employee.userId === actor.id
  const isAdmin = actor.permissions.includes('*') || actor.permissions.includes('benefit:*')
  if (!isSelf && !isAdmin) return { error: 'Forbidden' }
  if (enrollment.status === 'terminated') return { error: 'Already terminated' }

  await prisma.benefitEnrollment.update({
    where: { id },
    data: { status: 'terminated', effectiveTo: new Date() },
  })

  await recordAudit({
    userId: actor.id,
    action: 'benefit.terminated',
    entityType: 'BenefitEnrollment',
    entityId: id,
    after: { byAdmin: !isSelf },
  })

  if (!isSelf) {
    await notify({
      userId: enrollment.employee.userId,
      title: `Your ${enrollment.plan.name} enrollment was terminated`,
      link: '/benefits',
    })
  }

  revalidatePath('/benefits')
  revalidatePath(`/admin/benefits/${enrollment.planId}`)
  return { ok: true }
}

export async function addDependent(formData: FormData) {
  const user = await ensureEmployee()
  const parsed = DependentSchema.safeParse({
    enrollmentId: formData.get('enrollmentId'),
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    relation: formData.get('relation'),
    dob: formData.get('dob') || undefined,
  })
  if (!parsed.success) return { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors }

  const enrollment = await prisma.benefitEnrollment.findUnique({
    where: { id: parsed.data.enrollmentId },
    include: { plan: true },
  })
  if (!enrollment || enrollment.employeeId !== user.employee!.id) return { error: 'Not found' }
  if (enrollment.status !== 'active') return { error: 'Can only edit dependents on active enrollments' }
  if (!enrollment.plan.coversDependents) return { error: 'This plan does not cover dependents' }
  if (enrollment.coverageLevel === 'employee') {
    return { error: 'Change coverage level to add dependents' }
  }

  const dependent = await prisma.benefitDependent.create({ data: parsed.data })
  await recordAudit({
    userId: user.id,
    action: 'benefit.dependent.added',
    entityType: 'BenefitDependent',
    entityId: dependent.id,
    after: { enrollmentId: enrollment.id, relation: parsed.data.relation },
  })
  revalidatePath('/benefits')
  return { ok: true }
}

export async function removeDependent(formData: FormData) {
  const user = await ensureEmployee()
  const id = String(formData.get('id') || '')
  const dep = await prisma.benefitDependent.findUnique({
    where: { id },
    include: { enrollment: true },
  })
  if (!dep || dep.enrollment.employeeId !== user.employee!.id) return { error: 'Not found' }

  await prisma.benefitDependent.delete({ where: { id } })
  await recordAudit({
    userId: user.id,
    action: 'benefit.dependent.removed',
    entityType: 'BenefitDependent',
    entityId: id,
  })
  revalidatePath('/benefits')
  return { ok: true }
}

export async function changeCoverageLevel(formData: FormData) {
  const user = await ensureEmployee()
  const id = String(formData.get('id') || '')
  const level = String(formData.get('coverageLevel') || '')
  if (!COVERAGE_LEVELS.includes(level as any)) return { error: 'Invalid coverage level' }

  const enrollment = await prisma.benefitEnrollment.findUnique({
    where: { id },
    include: { plan: true },
  })
  if (!enrollment || enrollment.employeeId !== user.employee!.id) return { error: 'Not found' }
  if (enrollment.status !== 'active') return { error: 'Only active enrollments can change coverage' }
  if (level !== 'employee' && !enrollment.plan.coversDependents) {
    return { error: 'This plan does not cover dependents' }
  }

  await prisma.benefitEnrollment.update({ where: { id }, data: { coverageLevel: level } })
  await recordAudit({
    userId: user.id,
    action: 'benefit.coverage.changed',
    entityType: 'BenefitEnrollment',
    entityId: id,
    before: { coverageLevel: enrollment.coverageLevel },
    after: { coverageLevel: level },
  })
  revalidatePath('/benefits')
  return { ok: true }
}
