import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@/lib/db/client'
import { authenticateMobile, unauthorized } from '@/lib/modules/auth/mobile'
import { recordAudit } from '@/lib/modules/audit'
import { startApprovalChain } from '@/lib/modules/workflows'
import { SubmitLeaveSchema } from '@/lib/modules/leave/schemas'

export const dynamic = 'force-dynamic'

function daysBetween(start: Date, end: Date): number {
  return Math.floor((end.getTime() - start.getTime()) / 86400000) + 1
}

export async function POST(req: NextRequest) {
  const auth = await authenticateMobile(req.headers)
  if (!auth.ok) return unauthorized(auth.status, auth.error)
  if (!auth.user.employee) return NextResponse.json({ error: 'No employee record' }, { status: 400 })

  const body = await req.json().catch(() => null)
  const parsed = SubmitLeaveSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors }, { status: 400 })
  }
  const data = parsed.data
  const days = daysBetween(data.startDate, data.endDate)

  const year = data.startDate.getFullYear()
  const balance = await prisma.leaveBalance.findUnique({
    where: {
      employeeId_leaveType_year: { employeeId: auth.user.employee.id, leaveType: data.leaveType, year },
    },
  })
  if (data.leaveType !== 'unpaid' && (!balance || balance.balance < days)) {
    return NextResponse.json({ error: `Insufficient ${data.leaveType} balance` }, { status: 400 })
  }

  const request = await prisma.leaveRequest.create({
    data: {
      employeeId: auth.user.employee.id,
      leaveType: data.leaveType,
      startDate: data.startDate,
      endDate: data.endDate,
      days,
      reason: data.reason,
      status: 'pending',
    },
  })

  const employee = await prisma.employee.findUnique({
    where: { id: auth.user.employee.id },
    include: { manager: { include: { user: true } } },
  })
  const approverIds: string[] = []
  if (employee?.manager?.user) approverIds.push(employee.manager.user.id)
  if (approverIds.length > 0) {
    await startApprovalChain({
      entityType: 'LeaveRequest',
      entityId: request.id,
      approverIds,
      title: `Leave request from ${auth.user.employee.firstName} ${auth.user.employee.lastName}`,
      link: '/manager/approvals',
    })
  }

  await recordAudit({
    userId: auth.user.id,
    action: 'leave.submitted',
    entityType: 'LeaveRequest',
    entityId: request.id,
    after: { source: 'mobile' },
  })

  return NextResponse.json({ ok: true, request })
}
