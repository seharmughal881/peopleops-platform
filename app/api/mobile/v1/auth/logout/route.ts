import { NextResponse, type NextRequest } from 'next/server'
import { authenticateMobile } from '@/lib/modules/auth/mobile'
import { recordAudit } from '@/lib/modules/audit'

export const dynamic = 'force-dynamic'

// JWT-based auth is stateless — logout is a client-side discard of the token.
// This endpoint exists so clients can log a logout audit event.
export async function POST(req: NextRequest) {
  const auth = await authenticateMobile(req.headers)
  if (auth.ok) {
    await recordAudit({ userId: auth.user.id, action: 'auth.mobile.logout', entityType: 'User', entityId: auth.user.id })
  }
  return NextResponse.json({ ok: true })
}
