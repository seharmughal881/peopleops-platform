import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db/client'
import { readSession, type SessionPayload } from './session'
import { hasPermission, type Permission } from './rbac'

export const getSession = cache(async (): Promise<SessionPayload | null> => {
  return readSession()
})

export const requireUser = cache(async () => {
  const session = await getSession()
  if (!session?.userId) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { employee: true },
  })
  if (!user || user.status !== 'active') redirect('/api/auth/clear')

  return {
    id: user.id,
    email: user.email,
    employee: user.employee,
    roles: session.roles,
    permissions: session.permissions,
  }
})

export async function requirePermission(perm: Permission) {
  const user = await requireUser()
  if (!hasPermission(user.permissions, perm)) {
    throw new Error(`Forbidden: missing permission '${perm}'`)
  }
  return user
}

export async function loadUserPermissions(userId: string): Promise<{ roles: string[]; permissions: string[] }> {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: { role: true },
  })

  const roles = userRoles.map((ur) => ur.role.name)
  const perms = new Set<string>()
  for (const ur of userRoles) {
    try {
      const list: string[] = JSON.parse(ur.role.permissions)
      for (const p of list) perms.add(p)
    } catch {
      // ignore malformed permission JSON
    }
  }
  return { roles, permissions: Array.from(perms) }
}
