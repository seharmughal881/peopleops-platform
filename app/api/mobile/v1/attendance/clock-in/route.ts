import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@/lib/db/client'
import { authenticateMobile, unauthorized } from '@/lib/modules/auth/mobile'
import { recordAudit } from '@/lib/modules/audit'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = await authenticateMobile(req.headers)
  if (!auth.ok) return unauthorized(auth.status, auth.error)
  if (!auth.user.employee) return NextResponse.json({ error: 'No employee record' }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  const lat = typeof body.lat === 'number' ? body.lat : null
  const lng = typeof body.lng === 'number' ? body.lng : null

  const open = await prisma.attendanceLog.findFirst({
    where: { employeeId: auth.user.employee.id, clockOut: null },
  })
  if (open) return NextResponse.json({ error: 'Already clocked in', logId: open.id }, { status: 409 })

  const log = await prisma.attendanceLog.create({
    data: {
      employeeId: auth.user.employee.id,
      clockIn: new Date(),
      source: 'mobile',
      geoLat: lat,
      geoLng: lng,
    },
  })

  await recordAudit({
    userId: auth.user.id,
    action: 'attendance.clockIn',
    entityType: 'AttendanceLog',
    entityId: log.id,
    after: { source: 'mobile', geoLat: lat, geoLng: lng },
  })

  return NextResponse.json({ ok: true, log })
}
