'use server'

import bcrypt from 'bcryptjs'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { prisma } from '@/lib/db/client'
import { recordAudit } from '@/lib/modules/audit'
import { createSession, destroySession } from './session'
import { loadUserPermissions, requireUser } from './dal'
import { ChangePasswordSchema, LoginSchema } from './schemas'
import { verifyChallenge } from './mfa'
import { check, clearBucket } from './rate-limit'

export type LoginState = {
  error?: string
  fieldErrors?: { email?: string[]; password?: string[]; code?: string[] }
  mfaRequired?: boolean
} | undefined

const LOGIN_MAX_PER_WINDOW = 8
const LOGIN_WINDOW_SECONDS = 60 * 10 // 10 minutes

async function clientIp(): Promise<string> {
  const h = await headers()
  return (
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    h.get('x-real-ip') ||
    'unknown'
  )
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors }
  }
  const code = String(formData.get('code') ?? '').trim()
  const { email, password } = parsed.data
  const ip = await clientIp()

  const [ipLimit, emailLimit] = await Promise.all([
    check(`login:ip:${ip}`, LOGIN_MAX_PER_WINDOW, LOGIN_WINDOW_SECONDS),
    check(`login:email:${email}`, LOGIN_MAX_PER_WINDOW, LOGIN_WINDOW_SECONDS),
  ])
  if (!ipLimit.allowed || !emailLimit.allowed) {
    const wait = Math.max(ipLimit.resetSeconds, emailLimit.resetSeconds)
    return { error: `Too many attempts. Try again in ${Math.ceil(wait / 60)} minute(s).` }
  }

  const user = await prisma.user.findUnique({ where: { email } })

  if (!user || user.status !== 'active') {
    return { error: 'Invalid email or password' }
  }

  const ok = await bcrypt.compare(password, user.hashedPassword)
  if (!ok) {
    await recordAudit({
      userId: user.id,
      action: 'auth.login.failed',
      entityType: 'User',
      entityId: user.id,
    })
    return { error: 'Invalid email or password' }
  }

  if (user.mfaEnabled) {
    if (!code) {
      return { mfaRequired: true, error: 'Enter your 6-digit code from the authenticator app' }
    }
    const valid = await verifyChallenge(user.id, code)
    if (!valid) {
      await recordAudit({
        userId: user.id,
        action: 'auth.mfa.failed',
        entityType: 'User',
        entityId: user.id,
      })
      return { mfaRequired: true, fieldErrors: { code: ['Invalid code'] } }
    }
  }

  const { roles, permissions } = await loadUserPermissions(user.id)
  await createSession({ userId: user.id, roles, permissions })
  await clearBucket(`login:email:${email}`)
  await clearBucket(`login:ip:${ip}`)

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
  await recordAudit({
    userId: user.id,
    action: 'auth.login.success',
    entityType: 'User',
    entityId: user.id,
  })

  redirect(landingForRoles(roles))
}

export async function logoutAction() {
  await destroySession()
  redirect('/login')
}

export type ChangePasswordState = {
  ok?: true
  error?: string
  fieldErrors?: Record<string, string[] | undefined>
} | undefined

const CHANGE_PW_MAX_PER_WINDOW = 5
const CHANGE_PW_WINDOW_SECONDS = 60 * 10 // 10 minutes

export async function changePasswordAction(
  _prev: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const user = await requireUser()

  const parsed = ChangePasswordSchema.safeParse({
    currentPassword: formData.get('currentPassword'),
    newPassword: formData.get('newPassword'),
    confirmPassword: formData.get('confirmPassword'),
  })
  if (!parsed.success) {
    return { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const ip = await clientIp()
  const bucket = `change-pw:user:${user.id}`
  const limit = await check(bucket, CHANGE_PW_MAX_PER_WINDOW, CHANGE_PW_WINDOW_SECONDS)
  if (!limit.allowed) {
    return {
      error: `Too many attempts. Try again in ${Math.ceil(limit.resetSeconds / 60)} minute(s).`,
    }
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, hashedPassword: true },
  })
  if (!dbUser) {
    return { error: 'Account not found' }
  }

  const currentOk = await bcrypt.compare(parsed.data.currentPassword, dbUser.hashedPassword)
  if (!currentOk) {
    await recordAudit({
      userId: user.id,
      action: 'auth.password.change.failed',
      entityType: 'User',
      entityId: user.id,
      after: { ip },
    })
    return { fieldErrors: { currentPassword: ['Current password is incorrect'] } }
  }

  const newHashed = await bcrypt.hash(parsed.data.newPassword, 10)
  await prisma.user.update({
    where: { id: user.id },
    data: { hashedPassword: newHashed },
  })

  await clearBucket(bucket)
  await recordAudit({
    userId: user.id,
    action: 'auth.password.change.success',
    entityType: 'User',
    entityId: user.id,
    after: { ip },
  })

  return { ok: true }
}

function landingForRoles(roles: string[]): string {
  if (roles.includes('super_admin') || roles.includes('hr_admin')) return '/admin'
  if (roles.includes('manager')) return '/manager'
  return '/dashboard'
}
