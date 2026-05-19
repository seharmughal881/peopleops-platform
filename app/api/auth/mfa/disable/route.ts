import { NextResponse, type NextRequest } from 'next/server'
import { requireUser } from '@/lib/modules/auth'
import { disable } from '@/lib/modules/auth/mfa'
import { recordAudit } from '@/lib/modules/audit'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const user = await requireUser()
  const body = await req.json().catch(() => ({})) as { code?: string }
  try {
    await disable(user.id, body.code)
    await recordAudit({
      userId: user.id,
      action: 'auth.mfa.disabled',
      entityType: 'User',
      entityId: user.id,
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to disable MFA'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
