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
          status: idx === 0 ? 'pending' : 'pending',
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

export async function decideApproval(opts: {
  approvalId: string
  approverId: string
  decision: 'approved' | 'rejected'
  comments?: string
}) {
  const approval = await prisma.approval.findUnique({ where: { id: opts.approvalId } })
  if (!approval) throw new Error('Approval not found')
  if (approval.approverId !== opts.approverId) throw new Error('Not the assigned approver')
  if (approval.status !== 'pending') throw new Error('Approval already decided')

  return prisma.approval.update({
    where: { id: opts.approvalId },
    data: {
      status: opts.decision,
      comments: opts.comments,
      decidedAt: new Date(),
    },
  })
}

export async function pendingApprovalsFor(approverId: string) {
  return prisma.approval.findMany({
    where: { approverId, status: 'pending' },
    orderBy: { createdAt: 'desc' },
  })
}
