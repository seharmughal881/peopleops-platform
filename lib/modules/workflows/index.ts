import 'server-only'
import { prisma } from '@/lib/db/client'
import { notify } from '@/lib/modules/notifications'
import { enqueue } from '@/lib/jobs/queue'

export interface StartApprovalInput {
  entityType: string
  entityId: string
  approverIds: string[] // ordered, level 1 = first
  link?: string
  title: string
}

export async function startApprovalChain(input: StartApprovalInput) {
  const approvals = await Promise.all(
    input.approverIds.map((approverId, idx) =>
      prisma.approval.create({
        data: {
          entityType: input.entityType,
          entityId: input.entityId,
          approverId,
          level: idx + 1,
          status: idx === 0 ? 'pending' : 'waiting',
        },
      })
    )
  )

  const firstApprovalId = approvals[0]?.id
  const firstApproverId = input.approverIds[0]
  if (firstApproverId && firstApprovalId) {
    await notify({
      userId: firstApproverId,
      title: input.title,
      link: input.link,
    })
    await enqueue(
      { kind: 'leave.approval-reminder', approvalId: firstApprovalId },
      { delay: 24 * 60 * 60 * 1000 } // 24h reminder
    )
  }

  return approvals
}

export interface DecideApprovalResult {
  chainComplete: boolean
  finalDecision: 'approved' | 'rejected' | null
  nextApproval: { id: string; approverId: string; level: number } | null
}

// Decides one approval row and advances the chain atomically.
// - On reject: marks remaining 'waiting' rows as rejected ("auto-cancelled")
//   so they don't sit in the approver's queue forever.
// - On approve: promotes the lowest-level waiting row to 'pending'; if none
//   exists, the chain is complete and the caller should finalize the entity.
export async function decideApproval(opts: {
  approvalId: string
  approverId: string
  decision: 'approved' | 'rejected'
  comments?: string
}): Promise<DecideApprovalResult> {
  return prisma.$transaction(async (tx) => {
    const approval = await tx.approval.findUnique({ where: { id: opts.approvalId } })
    if (!approval) throw new Error('Approval not found')
    if (approval.approverId !== opts.approverId) throw new Error('Not the assigned approver')
    if (approval.status !== 'pending') throw new Error('Approval already decided')

    await tx.approval.update({
      where: { id: opts.approvalId },
      data: {
        status: opts.decision,
        comments: opts.comments,
        decidedAt: new Date(),
      },
    })

    if (opts.decision === 'rejected') {
      await tx.approval.updateMany({
        where: {
          entityType: approval.entityType,
          entityId: approval.entityId,
          status: 'waiting',
        },
        data: {
          status: 'rejected',
          decidedAt: new Date(),
          comments: 'Auto-cancelled (earlier rejection)',
        },
      })
      return { chainComplete: true, finalDecision: 'rejected', nextApproval: null }
    }

    const next = await tx.approval.findFirst({
      where: {
        entityType: approval.entityType,
        entityId: approval.entityId,
        level: { gt: approval.level },
        status: 'waiting',
      },
      orderBy: { level: 'asc' },
    })

    if (!next) {
      return { chainComplete: true, finalDecision: 'approved', nextApproval: null }
    }

    await tx.approval.update({
      where: { id: next.id },
      data: { status: 'pending' },
    })

    return {
      chainComplete: false,
      finalDecision: null,
      nextApproval: { id: next.id, approverId: next.approverId, level: next.level },
    }
  })
}

export async function pendingApprovalsFor(approverId: string) {
  return prisma.approval.findMany({
    where: { approverId, status: 'pending' },
    orderBy: { createdAt: 'desc' },
  })
}
