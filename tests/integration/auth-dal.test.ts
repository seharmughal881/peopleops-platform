import { beforeEach, describe, expect, it, vi } from 'vitest'
import { testPrisma, useIntegrationDb } from './db'

// react.cache wraps async functions for request-scoped memoization. In a plain
// test runner there is no enclosing request scope, so we substitute an identity
// wrapper that just calls through to the underlying function.
vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react')
  return { ...actual, cache: <T extends (...args: unknown[]) => unknown>(fn: T) => fn }
})

// readSession is mocked per-test so we can control what the "browser cookie"
// would return without exercising the real jose/cookies pipeline (that's
// covered separately by session.test.ts).
const sessionMock = vi.hoisted(() => ({
  readSession: vi.fn(),
}))
vi.mock('@/lib/modules/auth/session', async () => {
  const actual = await vi.importActual<typeof import('@/lib/modules/auth/session')>(
    '@/lib/modules/auth/session',
  )
  return { ...actual, readSession: sessionMock.readSession }
})

// next/navigation redirect() throws a special error in real Next.js to abort
// rendering; we mimic with a tagged Error subclass so tests can assert the
// destination without depending on the Next runtime.
class RedirectError extends Error {
  constructor(public destination: string) {
    super(`NEXT_REDIRECT:${destination}`)
  }
}
vi.mock('next/navigation', () => ({
  redirect: vi.fn((destination: string) => {
    throw new RedirectError(destination)
  }),
}))

import { getSession, requireUser, requirePermission, loadUserPermissions } from '@/lib/modules/auth/dal'

useIntegrationDb()

beforeEach(() => {
  sessionMock.readSession.mockReset()
})

async function seedUser(opts: { email: string; status?: string; withEmployee?: boolean }) {
  const user = await testPrisma.user.create({
    data: { email: opts.email, hashedPassword: 'x', status: opts.status ?? 'active' },
  })
  if (opts.withEmployee) {
    await testPrisma.employee.create({
      data: {
        userId: user.id,
        employeeCode: `EC-${user.id.slice(0, 6)}`,
        firstName: 'Test',
        lastName: 'Employee',
        joinDate: new Date('2024-01-01'),
      },
    })
  }
  return user
}

describe('getSession', () => {
  it('returns whatever readSession returns', async () => {
    sessionMock.readSession.mockResolvedValue({
      userId: 'u1',
      roles: ['employee'],
      permissions: ['leave:read'],
    })
    await expect(getSession()).resolves.toMatchObject({ userId: 'u1' })
  })

  it('returns null when there is no session', async () => {
    sessionMock.readSession.mockResolvedValue(null)
    await expect(getSession()).resolves.toBeNull()
  })
})

describe('requireUser', () => {
  it('redirects unauthenticated callers to /login', async () => {
    sessionMock.readSession.mockResolvedValue(null)
    await expect(requireUser()).rejects.toMatchObject({ destination: '/login' })
  })

  it('redirects to /api/auth/clear when the session userId no longer exists', async () => {
    sessionMock.readSession.mockResolvedValue({
      userId: 'ghost-id',
      roles: [],
      permissions: [],
    })
    await expect(requireUser()).rejects.toMatchObject({ destination: '/api/auth/clear' })
  })

  it('redirects to /api/auth/clear for a suspended user', async () => {
    const user = await seedUser({ email: 'suspended@x.com', status: 'suspended' })
    sessionMock.readSession.mockResolvedValue({
      userId: user.id,
      roles: [],
      permissions: [],
    })
    await expect(requireUser()).rejects.toMatchObject({ destination: '/api/auth/clear' })
  })

  it('returns the user record (with employee) and session roles/permissions', async () => {
    const user = await seedUser({ email: 'alice@x.com', withEmployee: true })
    sessionMock.readSession.mockResolvedValue({
      userId: user.id,
      roles: ['employee'],
      permissions: ['leave:read', 'leave:write'],
    })

    const result = await requireUser()
    expect(result).toMatchObject({
      id: user.id,
      email: 'alice@x.com',
      roles: ['employee'],
      permissions: ['leave:read', 'leave:write'],
    })
    expect(result.employee).not.toBeNull()
    expect(result.employee?.firstName).toBe('Test')
  })

  it('returns employee=null for an active user without an employee record', async () => {
    const user = await seedUser({ email: 'admin@x.com', withEmployee: false })
    sessionMock.readSession.mockResolvedValue({
      userId: user.id,
      roles: ['super_admin'],
      permissions: ['*'],
    })

    const result = await requireUser()
    expect(result.employee).toBeNull()
  })
})

describe('requirePermission', () => {
  it('returns the user when they hold the required permission', async () => {
    const user = await seedUser({ email: 'mgr@x.com' })
    sessionMock.readSession.mockResolvedValue({
      userId: user.id,
      roles: ['manager'],
      permissions: ['leave:approve'],
    })

    const result = await requirePermission('leave:approve')
    expect(result.id).toBe(user.id)
  })

  it('honors the super wildcard "*"', async () => {
    const user = await seedUser({ email: 'super@x.com' })
    sessionMock.readSession.mockResolvedValue({
      userId: user.id,
      roles: ['super_admin'],
      permissions: ['*'],
    })

    await expect(requirePermission('payroll:run')).resolves.toMatchObject({ id: user.id })
  })

  it('throws Forbidden when the permission is missing', async () => {
    const user = await seedUser({ email: 'employee@x.com' })
    sessionMock.readSession.mockResolvedValue({
      userId: user.id,
      roles: ['employee'],
      permissions: ['leave:read'],
    })

    await expect(requirePermission('payroll:run')).rejects.toThrow(/Forbidden.*payroll:run/)
  })
})

describe('loadUserPermissions', () => {
  async function seedRole(name: string, perms: string[]) {
    return testPrisma.role.create({
      data: { name, permissions: JSON.stringify(perms) },
    })
  }

  it('aggregates roles and deduplicates permissions across them', async () => {
    const user = await seedUser({ email: 'multi@x.com' })
    const employeeRole = await seedRole('employee', ['leave:read', 'profile:read'])
    const managerRole = await seedRole('manager', ['leave:approve', 'leave:read'])
    await testPrisma.userRole.create({ data: { userId: user.id, roleId: employeeRole.id } })
    await testPrisma.userRole.create({ data: { userId: user.id, roleId: managerRole.id } })

    const result = await loadUserPermissions(user.id)
    expect(result.roles.sort()).toEqual(['employee', 'manager'])
    expect(result.permissions.sort()).toEqual(['leave:approve', 'leave:read', 'profile:read'])
  })

  it('returns empty roles/permissions for a user with no role bindings', async () => {
    const user = await seedUser({ email: 'noroles@x.com' })
    await expect(loadUserPermissions(user.id)).resolves.toEqual({
      roles: [],
      permissions: [],
    })
  })

  it('survives malformed permissions JSON on a role without throwing', async () => {
    const user = await seedUser({ email: 'broken@x.com' })
    const good = await seedRole('good', ['leave:read'])
    const broken = await testPrisma.role.create({
      data: { name: 'broken', permissions: '{not valid json' },
    })
    await testPrisma.userRole.create({ data: { userId: user.id, roleId: good.id } })
    await testPrisma.userRole.create({ data: { userId: user.id, roleId: broken.id } })

    const result = await loadUserPermissions(user.id)
    expect(result.roles.sort()).toEqual(['broken', 'good'])
    expect(result.permissions).toEqual(['leave:read'])
  })
})
