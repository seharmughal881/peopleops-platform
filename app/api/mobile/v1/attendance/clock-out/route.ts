import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@/lib/db/client'
import { authenticateMobile, unauthorized } from '@/lib/modules/auth/mobile'
import { recordAudit } from '@/lib/modules/audit'
import { notifyAttendance } from '@/lib/modules/integrations/slack'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = await authenticateMobile(req.headers)
  if (!auth.ok) return unauthorized(auth.status, auth.error)
  if (!auth.user.employee) return NextResponse.json({ error: 'No employee record' }, { status: 400 })

  const open = await prisma.attendanceLog.findFirst({
    where: { employeeId: auth.user.employee.id, clockOut: null },
    orderBy: { clockIn: 'desc' },
  })
  if (!open) return NextResponse.json({ error: 'No active clock-in' }, { status: 409 })

  const now = new Date()
  const hours = (now.getTime() - new Date(open.clockIn).getTime()) / 3600000
  const status = hours > 8.5 ? 'overtime' : 'regular'

  const updated = await prisma.attendanceLog.update({
    where: { id: open.id },
    data: { clockOut: now, status },
  })

  await recordAudit({
    userId: auth.user.id,
    action: 'attendance.clockOut',
    entityType: 'AttendanceLog',
    entityId: updated.id,
    after: { hours: Number(hours.toFixed(2)) },
  })

  await notifyAttendance({
    employeeName: `${auth.user.employee.firstName} ${auth.user.employee.lastName}`,
    action: 'out',
    at: now,
    source: 'mobile',
    hours: Number(hours.toFixed(2)),
  })

  return NextResponse.json({ ok: true, log: updated, hours: Number(hours.toFixed(2)) })
}
