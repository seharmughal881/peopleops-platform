import * as OTPAuth from 'otpauth'
import { prisma } from '@/lib/db/client'

export interface MfaStatus {
  enabled: boolean
}

const ISSUER = 'HR System'
const PERIOD = 30
const DIGITS = 6
const WINDOW = 1 // accept codes ±30s for clock skew

export async function getMfaStatus(userId: string): Promise<MfaStatus> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { mfaEnabled: true } })
  return { enabled: Boolean(u?.mfaEnabled) }
}

/**
 * Generate a pending TOTP secret + otpauth URL. Stored as `mfaSecret` but `mfaEnabled` stays false
 * until the user proves possession by submitting a valid code via verifyEnrollment.
 */
export async function startEnrollment(userId: string): Promise<{ secret: string; otpauthUrl: string }> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true, mfaEnabled: true } })
  if (user.mfaEnabled) throw new Error('MFA already enabled — disable it first to re-enroll')

  const secret = new OTPAuth.Secret({ size: 20 })
  const totp = new OTPAuth.TOTP({
    issuer: ISSUER,
    label: user.email,
    algorithm: 'SHA1',
    digits: DIGITS,
    period: PERIOD,
    secret,
  })

  await prisma.user.update({
    where: { id: userId },
    data: { mfaSecret: secret.base32 },
  })

  return { secret: secret.base32, otpauthUrl: totp.toString() }
}

export async function verifyEnrollment(userId: string, code: string): Promise<boolean> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { mfaSecret: true, email: true, mfaEnabled: true } })
  if (user.mfaEnabled) return true
  if (!user.mfaSecret) return false

  const totp = buildTotp(user.email, user.mfaSecret)
  const delta = totp.validate({ token: code.replace(/\s+/g, ''), window: WINDOW })
  if (delta === null) return false

  await prisma.user.update({ where: { id: userId }, data: { mfaEnabled: true } })
  return true
}

export async function verifyChallenge(userId: string, code: string): Promise<boolean> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { mfaSecret: true, email: true, mfaEnabled: true },
  })
  if (!user.mfaEnabled || !user.mfaSecret) return true // no challenge required
  const totp = buildTotp(user.email, user.mfaSecret)
  return totp.validate({ token: code.replace(/\s+/g, ''), window: WINDOW }) !== null
}

export async function disable(userId: string, currentCode?: string): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { mfaSecret: true, email: true, mfaEnabled: true },
  })
  if (!user.mfaEnabled) return
  if (currentCode && user.mfaSecret) {
    const totp = buildTotp(user.email, user.mfaSecret)
    if (totp.validate({ token: currentCode.replace(/\s+/g, ''), window: WINDOW }) === null) {
      throw new Error('Invalid TOTP code')
    }
  }
  await prisma.user.update({
    where: { id: userId },
    data: { mfaEnabled: false, mfaSecret: null },
  })
}

function buildTotp(label: string, base32Secret: string) {
  return new OTPAuth.TOTP({
    issuer: ISSUER,
    label,
    algorithm: 'SHA1',
    digits: DIGITS,
    period: PERIOD,
    secret: OTPAuth.Secret.fromBase32(base32Secret),
  })
}

export async function isMfaRequired(userId: string): Promise<boolean> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { mfaEnabled: true } })
  return Boolean(u?.mfaEnabled)
}
