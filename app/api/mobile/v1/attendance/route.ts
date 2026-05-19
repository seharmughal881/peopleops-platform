import { NextResponse, type NextRequest } from 'next/server'
import { authenticateMobile, unauthorized } from '@/lib/modules/auth/mobile'
import { getOpenLog, listMyAttendance } from '@/lib/modules/attendance/queries'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await authenticateMobile(req.headers)
  if (!auth.ok) return unauthorized(auth.status, auth.error)
  if (!auth.user.employee) return NextResponse.json({ error: 'No employee record' }, { status: 400 })

  const days = Number(new URL(req.url).searchParams.get('days') ?? 30)
  const [open, logs] = await Promise.all([
    getOpenLog(auth.user.employee.id),
    listMyAttendance(auth.user.employee.id, { days }),
  ])
  return NextResponse.json({ openLog: open, logs })
}
