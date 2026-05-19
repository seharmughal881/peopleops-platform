import { NextResponse, type NextRequest } from 'next/server'
import QRCode from 'qrcode'
import { requireUser } from '@/lib/modules/auth'
import { startEnrollment } from '@/lib/modules/auth/mfa'
import { recordAudit } from '@/lib/modules/audit'

export const dynamic = 'force-dynamic'

// Initiates MFA enrollment for the currently signed-in user (cookie session).
// Returns the secret (base32, for manual entry) + an otpauth URL + a QR code data URL.
export async function POST(_req: NextRequest) {
  try {
    const user = await requireUser()
    const { secret, otpauthUrl } = await startEnrollment(user.id)
    const qrDataUrl = await QRCode.toDataURL(otpauthUrl, { margin: 1, width: 240 })
    await recordAudit({
      userId: user.id,
      action: 'auth.mfa.enroll.started',
      entityType: 'User',
      entityId: user.id,
    })
    return NextResponse.json({ secret, otpauthUrl, qrDataUrl })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Enrollment failed'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
