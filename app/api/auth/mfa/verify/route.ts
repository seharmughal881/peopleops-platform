import { NextResponse, type NextRequest } from 'next/server'
import { requireUser } from '@/lib/modules/auth'
import { verifyEnrollment } from '@/lib/modules/auth/mfa'
import { recordAudit } from '@/lib/modules/audit'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const user = await requireUser()
  const body = await req.json().catch(() => null) as { code?: string } | null
  const code = body?.code?.trim()
  if (!code) return NextResponse.json({ error: 'Code required' }, { status: 400 })

  const ok = await verifyEnrollment(user.id, code)
  if (!ok) {
    await recordAudit({
      userId: user.id,
      action: 'auth.mfa.enroll.failed',
      entityType: 'User',
      entityId: user.id,
    })
    return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
  }

  await recordAudit({
    userId: user.id,
    action: 'auth.mfa.enrolled',
    entityType: 'User',
    entityId: user.id,
  })
  return NextResponse.json({ ok: true, enabled: true })
}
