// Mobile API auth — Bearer token reuse of the same JWT, but read from `Authorization: Bearer <jwt>`.
import 'server-only'
import { prisma } from '@/lib/db/client'
import { decrypt, encrypt, type SessionPayload } from './session'
import { loadUserPermissions } from './dal'
import { hasPermission, type Permission } from './rbac'

const TOKEN_TTL_DAYS = 30

export interface MobileUser {
  id: string
  email: string
  employee: { id: string; firstName: string; lastName: string; employeeCode: string } | null
  roles: string[]
  permissions: string[]
}

export async function issueMobileToken(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const { roles, permissions } = await loadUserPermissions(userId)
  const expiresAt = new Date(Date.now() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000)
  const token = await encrypt({ userId, roles, permissions } as SessionPayload, expiresAt)
  return { token, expiresAt }
}

export function readBearer(headers: Headers): string | null {
  const auth = headers.get('authorization')
  if (!auth) return null
  const m = auth.match(/^Bearer\s+(.+)$/i)
  return m ? m[1]! : null
}

export async function authenticateMobile(headers: Headers): Promise<
  | { ok: true; user: MobileUser; session: SessionPayload }
  | { ok: false; status: 401 | 403; error: string }
> {
  const token = readBearer(headers)
  if (!token) return { ok: false, status: 401, error: 'Missing bearer token' }

  const session = await decrypt(token)
  if (!session?.userId) return { ok: false, status: 401, error: 'Invalid or expired token' }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } },
  })
  if (!user || user.status !== 'active') return { ok: false, status: 401, error: 'Account not active' }

  return {
    ok: true,
    session,
    user: {
      id: user.id,
      email: user.email,
      employee: user.employee,
      roles: session.roles,
      permissions: session.permissions,
    },
  }
}

export function requireMobilePerm(user: MobileUser, perm: Permission): { ok: true } | { ok: false; status: 403; error: string } {
  if (!hasPermission(user.permissions, perm)) {
    return { ok: false, status: 403, error: `Missing permission '${perm}'` }
  }
  return { ok: true }
}

export function unauthorized(status: 401 | 403, error: string) {
  return Response.json({ error }, { status })
}
