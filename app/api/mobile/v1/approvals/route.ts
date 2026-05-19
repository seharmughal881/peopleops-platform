import { NextResponse, type NextRequest } from 'next/server'
import { authenticateMobile, unauthorized } from '@/lib/modules/auth/mobile'
import { pendingLeaveApprovalsFor } from '@/lib/modules/leave/queries'
import { pendingExpenseApprovalsFor } from '@/lib/modules/expenses/queries'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await authenticateMobile(req.headers)
  if (!auth.ok) return unauthorized(auth.status, auth.error)

  const [leave, expenses] = await Promise.all([
    pendingLeaveApprovalsFor(auth.user.id),
    pendingExpenseApprovalsFor(auth.user.id),
  ])
  return NextResponse.json({ leave, expenses })
}
