'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/db/client'
import { requireUser } from '@/lib/modules/auth'
import { recordAudit } from '@/lib/modules/audit'
import { notify } from '@/lib/modules/notifications'
import { startApprovalChain } from '@/lib/modules/workflows'
import { resolveApprovers } from '@/lib/modules/workflows/rules'

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
  approvalId: z.string().min(1),
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

  const approverIds = await resolveHiringApprovers({
    requesterEmployeeId: user.employee.id,
    proposedBudget: parsed.data.proposedBudget ?? 0,
    urgency: parsed.data.urgency,
    headcount: parsed.data.headcount,
  })

  if (approverIds.length > 0) {
    await startApprovalChain({
      entityType: 'HiringRequest',
      entityId: request.id,
      approverIds,
      title: `Hiring request: ${request.jobTitle} (${request.headcount} headcount)`,
      link: '/admin/hiring-requests',
    })
  }

  await recordAudit({
    userId: user.id,
    action: 'hiring.requested',
    entityType: 'HiringRequest',
    entityId: request.id,
    after: {
      jobTitle: request.jobTitle,
      headcount: request.headcount,
      urgency: request.urgency,
      approverLevels: approverIds.length,
    },
  })

  revalidatePath('/manager/hiring-requests')
  revalidatePath('/admin/hiring-requests')
  return { ok: true, id: request.id, approverLevels: approverIds.length }
}

// Resolution order:
//   1. Active ApprovalRule for entityType=HiringRequest (admin-configurable).
//   2. Hard-coded fallback: requester's manager → first hr_admin → first finance
//      user (finance is only added when proposedBudget > 0).
// The chain is deduplicated to avoid asking the same person twice when a
// requester happens to also be the manager or HR admin.
async function resolveHiringApprovers(ctx: {
  requesterEmployeeId: string
  proposedBudget: number
  urgency: string
  headcount: number
}): Promise<string[]> {
  const ruleApprovers = await resolveApprovers('HiringRequest', {
    employeeId: ctx.requesterEmployeeId,
    proposedBudget: ctx.proposedBudget,
    urgency: ctx.urgency,
    headcount: ctx.headcount,
  })
  if (ruleApprovers && ruleApprovers.length > 0) return ruleApprovers

  const chain: string[] = []
  const seen = new Set<string>()
  const push = (id: string | null | undefined) => {
    if (id && !seen.has(id)) { chain.push(id); seen.add(id) }
  }

  const requester = await prisma.employee.findUnique({
    where: { id: ctx.requesterEmployeeId },
    include: { manager: { select: { userId: true } } },
  })
  push(requester?.manager?.userId)

  // Deterministic pick: sort by userId so the same role always routes to the
  // same user across requests (otherwise different approvals of the same
  // request type could land on different people).
  const hrRole = await prisma.role.findUnique({ where: { name: 'hr_admin' } })
  if (hrRole) {
    const hr = await prisma.userRole.findFirst({
      where: { roleId: hrRole.id },
      orderBy: { userId: 'asc' },
      select: { userId: true },
    })
    push(hr?.userId)
  }

  if (ctx.proposedBudget > 0) {
    const financeRole = await prisma.role.findUnique({ where: { name: 'finance' } })
    if (financeRole) {
      const finance = await prisma.userRole.findFirst({
        where: { roleId: financeRole.id },
        orderBy: { userId: 'asc' },
        select: { userId: true },
      })
      push(finance?.userId)
    }
  }

  return chain
}

export async function decideHiringRequest(formData: FormData) {
  const user = await requireUser()

  const parsed = DecideSchema.safeParse({
    approvalId: formData.get('approvalId'),
    decision: formData.get('decision'),
    comments: formData.get('comments') || undefined,
  })
  if (!parsed.success) return { error: 'Validation failed' }
  const { approvalId, decision, comments } = parsed.data

  // All status reads + writes happen atomically so two concurrent approvers
  // can't both observe `pending` and both write conflicting final statuses.
  let txResult:
    | { kind: 'error'; error: string }
    | {
        kind: 'ok'
        req: { id: string; jobTitle: string; requestedByUserId: string }
        approvalLevel: number
        totalLevels: number
        nextPending: { approverId: string; level: number } | null
      }
  try {
    txResult = await prisma.$transaction(async (tx) => {
      const approval = await tx.approval.findUnique({ where: { id: approvalId } })
      if (!approval || approval.entityType !== 'HiringRequest') {
        return { kind: 'error' as const, error: 'Approval not found' }
      }
      if (approval.approverId !== user.id) {
        return { kind: 'error' as const, error: 'Not your approval to decide' }
      }
      if (approval.status !== 'pending') {
        return { kind: 'error' as const, error: 'Already decided' }
      }

      const req = await tx.hiringRequest.findUnique({
        where: { id: approval.entityId },
        include: { requestedBy: { select: { userId: true } } },
      })
      if (!req) return { kind: 'error' as const, error: 'Hiring request not found' }
      if (req.status !== 'pending') {
        return { kind: 'error' as const, error: 'Hiring request already finalized' }
      }

      await tx.approval.update({
        where: { id: approvalId },
        data: { status: decision, comments, decidedAt: new Date() },
      })

      const chain = await tx.approval.findMany({
        where: { entityType: 'HiringRequest', entityId: req.id },
        orderBy: { level: 'asc' },
      })
      // Next level may be 'waiting' (new chains) or 'pending' (legacy chains
      // that pre-date the chain-advance fix). Promote to 'pending' so the
      // next approver's dashboard surfaces it.
      const nextPending = chain.find(
        (a) => a.level > approval.level && (a.status === 'waiting' || a.status === 'pending'),
      )

      if (decision === 'rejected') {
        // Cascade rejection to any remaining waiting/pending levels.
        await tx.approval.updateMany({
          where: {
            entityType: 'HiringRequest',
            entityId: req.id,
            status: { in: ['waiting', 'pending'] },
          },
          data: {
            status: 'rejected',
            decidedAt: new Date(),
            comments: 'Auto-cancelled (earlier rejection)',
          },
        })
      } else if (nextPending && nextPending.status === 'waiting') {
        await tx.approval.update({
          where: { id: nextPending.id },
          data: { status: 'pending' },
        })
      }

      if (decision === 'rejected' || !nextPending) {
        await tx.hiringRequest.update({
          where: { id: req.id },
          data: {
            status: decision === 'rejected' ? 'rejected' : 'approved',
            reviewedById: user.id,
            reviewedAt: new Date(),
            reviewerComments: comments,
          },
        })
      }

      return {
        kind: 'ok' as const,
        req: { id: req.id, jobTitle: req.jobTitle, requestedByUserId: req.requestedBy.userId },
        approvalLevel: approval.level,
        totalLevels: chain.length,
        nextPending: nextPending ? { approverId: nextPending.approverId, level: nextPending.level } : null,
      }
    })
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to decide' }
  }

  if (txResult.kind === 'error') return { error: txResult.error }
  const { req, approvalLevel, totalLevels, nextPending } = txResult

  // Side effects (notifications + audit) intentionally outside the transaction:
  // they're best-effort and shouldn't be able to roll back the decision itself.
  if (decision === 'rejected') {
    await notify({
      userId: req.requestedByUserId,
      title: `Hiring request rejected: ${req.jobTitle}`,
      body: comments,
      link: '/manager/hiring-requests',
    })
    await recordAudit({
      userId: user.id,
      action: 'hiring.rejected',
      entityType: 'HiringRequest',
      entityId: req.id,
      after: { level: approvalLevel, totalLevels },
    })
  } else if (nextPending) {
    await notify({
      userId: nextPending.approverId,
      title: `Hiring request needs your approval: ${req.jobTitle}`,
      body: `Level ${approvalLevel} approved by previous approver. ${comments ?? ''}`.trim(),
      link: '/admin/hiring-requests',
    })
    await recordAudit({
      userId: user.id,
      action: 'hiring.level-approved',
      entityType: 'HiringRequest',
      entityId: req.id,
      after: { level: approvalLevel, nextLevel: nextPending.level, totalLevels },
    })
  } else {
    await notify({
      userId: req.requestedByUserId,
      title: `Hiring request approved: ${req.jobTitle}`,
      body: comments,
      link: '/manager/hiring-requests',
    })
    await recordAudit({
      userId: user.id,
      action: 'hiring.approved',
      entityType: 'HiringRequest',
      entityId: req.id,
      after: { finalLevel: approvalLevel, totalLevels },
    })
  }

  revalidatePath('/manager/hiring-requests')
  revalidatePath('/admin/hiring-requests')
  return { ok: true, finalized: !nextPending || decision === 'rejected' }
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
  const requests = await prisma.hiringRequest.findMany({
    where: opts.status ? { status: opts.status } : undefined,
    include: {
      requestedBy: { select: { firstName: true, lastName: true, employeeCode: true } },
      department: { select: { name: true } },
    },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    take: 100,
  })
  if (requests.length === 0) return []
  const approvals = await prisma.approval.findMany({
    where: { entityType: 'HiringRequest', entityId: { in: requests.map((r) => r.id) } },
    orderBy: { level: 'asc' },
    include: { approver: { select: { id: true, email: true } } },
  })
  const byEntity = new Map<string, typeof approvals>()
  for (const a of approvals) {
    const list = byEntity.get(a.entityId) ?? []
    list.push(a)
    byEntity.set(a.entityId, list)
  }
  return requests.map((r) => ({ ...r, approvals: byEntity.get(r.id) ?? [] }))
}
