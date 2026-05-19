import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@/lib/db/client'
import { authenticateMobile, unauthorized } from '@/lib/modules/auth/mobile'
import { decideApproval } from '@/lib/modules/workflows'
import { notify } from '@/lib/modules/notifications'
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

  await decideApproval({
    approvalId: body.approvalId,
    approverId: auth.user.id,
    decision: body.decision!,
    comments: body.comments,
  })

  if (approval.entityType === 'LeaveRequest') {
    const request = await prisma.leaveRequest.findUnique({
      where: { id: approval.entityId },
      include: { employee: { include: { user: true } } },
    })
    if (request) {
      if (body.decision === 'approved') {
        if (request.leaveType !== 'unpaid') {
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
          data: { status: 'approved', decidedAt: new Date() },
        })
      } else {
        await prisma.leaveRequest.update({
          where: { id: request.id },
          data: { status: 'rejected', decidedAt: new Date() },
        })
      }
      await notify({
        userId: request.employee.user.id,
        title: `Leave ${body.decision}`,
        body: body.comments,
        link: '/leave',
      })
    }
  } else if (approval.entityType === 'Expense') {
    const remaining = await prisma.approval.count({
      where: { entityType: 'Expense', entityId: approval.entityId, status: 'pending' },
    })
    if (body.decision === 'rejected') {
      await prisma.expense.update({ where: { id: approval.entityId }, data: { status: 'rejected', decidedAt: new Date() } })
      await prisma.approval.updateMany({
        where: { entityType: 'Expense', entityId: approval.entityId, status: 'pending' },
        data: { status: 'rejected', decidedAt: new Date(), comments: 'Auto-cancelled (earlier rejection)' },
      })
    } else if (remaining === 0) {
      await prisma.expense.update({ where: { id: approval.entityId }, data: { status: 'approved', decidedAt: new Date() } })
    }
    const expense = await prisma.expense.findUnique({
      where: { id: approval.entityId },
      include: { employee: { include: { user: true } } },
    })
    if (expense) {
      await notify({
        userId: expense.employee.user.id,
        title: `Expense ${body.decision === 'approved' && remaining === 0 ? 'fully approved' : body.decision}`,
        body: body.comments,
        link: '/expenses',
      })
    }
  }

  await recordAudit({
    userId: auth.user.id,
    action: `${approval.entityType.toLowerCase()}.${body.decision}.mobile`,
    entityType: approval.entityType,
    entityId: approval.entityId,
  })

  return NextResponse.json({ ok: true })
}
