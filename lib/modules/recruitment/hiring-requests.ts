'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/db/client'
import { requireUser } from '@/lib/modules/auth'
import { recordAudit } from '@/lib/modules/audit'
import { notify } from '@/lib/modules/notifications'

const CreateSchema = z.object({
  departmentId: z.string().optional().or(z.literal('').transform(() => undefined)),
  jobTitle: z.string().min(1).max(160),
  headcount: z.coerce.number().int().positive().default(1),
  urgency: z.enum(['low', 'normal', 'high', 'critical']).default('normal'),
  justification: z.string().min(1).max(4000),
  proposedBudget: z.preprocess(
    (v) => (v === '' || v == null ? undefined : v),
    z.coerce.number().nonnegative().optional(),
  ),
})

const DecideSchema = z.object({
  id: z.string().min(1),
  decision: z.enum(['approved', 'rejected']),
  comments: z.string().max(2000).optional(),
})

export async function createHiringRequest(formData: FormData) {
  const user = await requireUser()
  if (!user.employee) return { error: 'No employee record' }

  const parsed = CreateSchema.safeParse({
    departmentId: formData.get('departmentId') || undefined,
    jobTitle: formData.get('jobTitle'),
    headcount: formData.get('headcount') || 1,
    urgency: formData.get('urgency') || 'normal',
    justification: formData.get('justification'),
    proposedBudget: formData.get('proposedBudget') || undefined,
  })
  if (!parsed.success) return { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors }

  const request = await prisma.hiringRequest.create({
    data: { ...parsed.data, requestedById: user.employee.id },
  })

  await recordAudit({
    userId: user.id,
    action: 'hiring.requested',
    entityType: 'HiringRequest',
    entityId: request.id,
    after: { jobTitle: request.jobTitle, headcount: request.headcount, urgency: request.urgency },
  })

  const hrAdminRole = await prisma.role.findUnique({ where: { name: 'hr_admin' } })
  if (hrAdminRole) {
    const recipients = await prisma.userRole.findMany({ where: { roleId: hrAdminRole.id }, select: { userId: true } })
    for (const r of recipients) {
      await notify({
        userId: r.userId,
        title: `New hiring request: ${request.jobTitle}`,
        body: `From ${user.employee.firstName} ${user.employee.lastName} — ${request.headcount} headcount, ${request.urgency} urgency`,
        link: '/admin/hiring-requests',
      })
    }
  }

  revalidatePath('/manager/hiring-requests')
  revalidatePath('/admin/hiring-requests')
  return { ok: true, id: request.id }
}

export async function decideHiringRequest(formData: FormData) {
  const user = await requireUser()
  const isAdmin = user.permissions.includes('*') || user.roles.includes('hr_admin') || user.roles.includes('recruiter')
  if (!isAdmin) return { error: 'Forbidden' }

  const parsed = DecideSchema.safeParse({
    id: formData.get('id'),
    decision: formData.get('decision'),
    comments: formData.get('comments') || undefined,
  })
  if (!parsed.success) return { error: 'Validation failed' }

  const req = await prisma.hiringRequest.findUnique({
    where: { id: parsed.data.id },
    include: { requestedBy: { include: { user: true } } },
  })
  if (!req) return { error: 'Not found' }
  if (req.status !== 'pending') return { error: 'Already decided' }

  await prisma.hiringRequest.update({
    where: { id: req.id },
    data: {
      status: parsed.data.decision,
      reviewedById: user.id,
      reviewedAt: new Date(),
      reviewerComments: parsed.data.comments,
    },
  })

  await recordAudit({
    userId: user.id,
    action: `hiring.${parsed.data.decision}`,
    entityType: 'HiringRequest',
    entityId: req.id,
  })

  await notify({
    userId: req.requestedBy.userId,
    title: `Hiring request ${parsed.data.decision}: ${req.jobTitle}`,
    body: parsed.data.comments,
    link: '/manager/hiring-requests',
  })

  revalidatePath('/manager/hiring-requests')
  revalidatePath('/admin/hiring-requests')
  return { ok: true }
}

export async function withdrawHiringRequest(formData: FormData) {
  const user = await requireUser()
  if (!user.employee) return { error: 'No employee record' }
  const id = String(formData.get('id') || '')
  const req = await prisma.hiringRequest.findUnique({ where: { id } })
  if (!req) return { error: 'Not found' }
  if (req.requestedById !== user.employee.id) return { error: 'Forbidden' }
  if (req.status !== 'pending') return { error: 'Only pending requests can be withdrawn' }

  await prisma.hiringRequest.update({ where: { id }, data: { status: 'withdrawn' } })
  await recordAudit({ userId: user.id, action: 'hiring.withdrawn', entityType: 'HiringRequest', entityId: id })
  revalidatePath('/manager/hiring-requests')
  revalidatePath('/admin/hiring-requests')
  return { ok: true }
}

export async function listMyHiringRequests(requesterEmployeeId: string) {
  return prisma.hiringRequest.findMany({
    where: { requestedById: requesterEmployeeId },
    include: { department: { select: { name: true } } },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  })
}

export async function listAllHiringRequests(opts: { status?: string } = {}) {
  return prisma.hiringRequest.findMany({
    where: opts.status ? { status: opts.status } : undefined,
    include: {
      requestedBy: { select: { firstName: true, lastName: true, employeeCode: true } },
      department: { select: { name: true } },
    },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    take: 100,
  })
}
