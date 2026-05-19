import { NextResponse, type NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db/client'
import { issueMobileToken } from '@/lib/modules/auth/mobile'
import { LoginSchema } from '@/lib/modules/auth/schemas'
import { verifyChallenge } from '@/lib/modules/auth/mfa'
import { check, clearBucket } from '@/lib/modules/auth/rate-limit'
import { recordAudit } from '@/lib/modules/audit'

export const dynamic = 'force-dynamic'

const LOGIN_MAX_PER_WINDOW = 8
const LOGIN_WINDOW_SECONDS = 60 * 10

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = LoginSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', fieldErrors: parsed.error.flatten().fieldErrors }, { status: 400 })
  }
  const code = typeof body === 'object' && body && typeof body.code === 'string' ? body.code.trim() : undefined
  const { email, password } = parsed.data

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('x-real-ip')
    ?? 'unknown'

  const [ipLimit, emailLimit] = await Promise.all([
    check(`login:ip:${ip}`, LOGIN_MAX_PER_WINDOW, LOGIN_WINDOW_SECONDS),
    check(`login:email:${email}`, LOGIN_MAX_PER_WINDOW, LOGIN_WINDOW_SECONDS),
  ])
  if (!ipLimit.allowed || !emailLimit.allowed) {
    const wait = Math.max(ipLimit.resetSeconds, emailLimit.resetSeconds)
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${Math.ceil(wait / 60)} minute(s).` },
      { status: 429 },
    )
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } },
  })
  if (!user || user.status !== 'active') {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
  }

  const ok = await bcrypt.compare(password, user.hashedPassword)
  if (!ok) {
    await recordAudit({ userId: user.id, action: 'auth.mobile.login.failed', entityType: 'User', entityId: user.id })
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
  }

  if (user.mfaEnabled) {
    if (!code) {
      return NextResponse.json({ mfaRequired: true, error: 'MFA code required' }, { status: 401 })
    }
    const valid = await verifyChallenge(user.id, code)
    if (!valid) {
      await recordAudit({ userId: user.id, action: 'auth.mobile.mfa.failed', entityType: 'User', entityId: user.id })
      return NextResponse.json({ mfaRequired: true, error: 'Invalid MFA code' }, { status: 401 })
    }
  }

  const { token, expiresAt } = await issueMobileToken(user.id)
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
  await clearBucket(`login:email:${email}`)
  await clearBucket(`login:ip:${ip}`)
  await recordAudit({ userId: user.id, action: 'auth.mobile.login.success', entityType: 'User', entityId: user.id })

  return NextResponse.json({
    token,
    expiresAt: expiresAt.toISOString(),
    user: { id: user.id, email: user.email, employee: user.employee },
  })
}
