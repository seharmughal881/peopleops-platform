import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@/lib/db/client'
import { authenticateMobile, unauthorized } from '@/lib/modules/auth/mobile'
import { decideApproval } from '@/lib/modules/workflows'
import { notify } from '@/lib/modules/notifications'
import { enqueue } from '@/lib/jobs/queue'
import { recordAudit } from '@/lib/modules/audit'

export const dynamic = 'force-dynamic'

// Decide a pending approval — works for both LeaveRequest and Expense entity types.
export async function POST(req: NextRequest) {
  const auth = await authenticateMobile(req.headers)
  if (!auth.ok) return unauthorized(auth.status, auth.error)

  const body = await req.json().catch(() => null) as
    | { approvalId?: string; decision?: 'approved' | 'rejected'; comments?: string }
    | null
  if (!body?.approvalId || !['approved', 'rejected'].includes(body.decision ?? '')) {
    return NextResponse.json({ error: 'approvalId and decision (approved|rejected) required' }, { status: 400 })
  }

  const approval = await prisma.approval.findUnique({ where: { id: body.approvalId } })
  if (!approval) return NextResponse.json({ error: 'Approval not found' }, { status: 404 })
  if (approval.approverId !== auth.user.id) {
    return NextResponse.json({ error: 'Not the assigned approver' }, { status: 403 })
  }
  if (approval.status !== 'pending') {
    return NextResponse.json({ error: 'Already decided' }, { status: 409 })
  }

  let result
  try {
    result = await decideApproval({
      approvalId: body.approvalId,
      approverId: auth.user.id,
      decision: body.decision!,
      comments: body.comments,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to decide' },
      { status: 400 },
    )
  }

  if (approval.entityType === 'LeaveRequest') {
    const request = await prisma.leaveRequest.findUnique({
      where: { id: approval.entityId },
      include: { employee: true },
    })
    if (request && result.chainComplete) {
      if (result.finalDecision === 'approved' && request.leaveType !== 'unpaid') {
        await prisma.leaveBalance.update({
          where: {
            employeeId_leaveType_year: {
              employeeId: request.employeeId,
              leaveType: request.leaveType,
              year: request.startDate.getFullYear(),
            },
          },
          data: { balance: { decrement: request.days } },
        })
      }
      await prisma.leaveRequest.update({
        where: { id: request.id },
        data: { status: result.finalDecision!, decidedAt: new Date() },
      })
      await notify({
        userId: request.employee.userId,
        title: `Leave ${result.finalDecision}`,
        body: body.comments,
        link: '/leave',
      })
    } else if (request && result.nextApproval) {
      await notify({
        userId: result.nextApproval.approverId,
        title: `Leave request from ${request.employee.firstName} ${request.employee.lastName}`,
        body: body.comments
          ? `Approved at level ${approval.level}. ${body.comments}`
          : `Approved at level ${approval.level}.`,
        link: '/manager/approvals',
      })
      await enqueue(
        { kind: 'leave.approval-reminder', approvalId: result.nextApproval.id },
        { delay: 24 * 60 * 60 * 1000 },
      )
    }
  } else if (approval.entityType === 'Expense') {
    const expense = await prisma.expense.findUnique({
      where: { id: approval.entityId },
      include: { employee: true },
    })
    if (expense && result.chainComplete) {
      await prisma.expense.update({
        where: { id: expense.id },
        data: { status: result.finalDecision!, decidedAt: new Date() },
      })
      await notify({
        userId: expense.employee.userId,
        title: `Expense ${result.finalDecision === 'approved' ? 'fully approved' : 'rejected'}`,
        body: body.comments,
        link: '/expenses',
      })
    } else if (expense && result.nextApproval) {
      await notify({
        userId: result.nextApproval.approverId,
        title: `Expense ${expense.amount.toFixed(2)} ${expense.currency} from ${expense.employee.firstName} ${expense.employee.lastName}`,
        body: body.comments
          ? `Approved at level ${approval.level}. ${body.comments}`
          : `Approved at level ${approval.level}.`,
        link: '/manager/approvals',
      })
      await enqueue(
        { kind: 'leave.approval-reminder', approvalId: result.nextApproval.id },
        { delay: 24 * 60 * 60 * 1000 },
      )
    }
  }

  await recordAudit({
    userId: auth.user.id,
    action: `${approval.entityType.toLowerCase()}.${body.decision}.mobile`,
    entityType: approval.entityType,
    entityId: approval.entityId,
  })

  return NextResponse.json({ ok: true, chainComplete: result.chainComplete })
}
