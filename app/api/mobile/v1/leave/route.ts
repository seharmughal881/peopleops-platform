import { NextResponse, type NextRequest } from 'next/server'
import { authenticateMobile, unauthorized } from '@/lib/modules/auth/mobile'
import { myLeaveBalances, myLeaveRequests } from '@/lib/modules/leave/queries'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await authenticateMobile(req.headers)
  if (!auth.ok) return unauthorized(auth.status, auth.error)
  if (!auth.user.employee) return NextResponse.json({ error: 'No employee record' }, { status: 400 })

  const [balances, requests] = await Promise.all([
    myLeaveBalances(auth.user.employee.id),
    myLeaveRequests(auth.user.employee.id),
  ])
  return NextResponse.json({ balances, requests })
}
