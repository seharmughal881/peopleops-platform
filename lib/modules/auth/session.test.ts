import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const cookieJar = vi.hoisted(() => {
  type CookieRecord = { name: string; value: string; options?: Record<string, unknown> }
  const store = new Map<string, CookieRecord>()
  return {
    store,
    get: vi.fn((name: string) => {
      const r = store.get(name)
      return r ? { name: r.name, value: r.value } : undefined
    }),
    set: vi.fn((name: string, value: string, options?: Record<string, unknown>) => {
      store.set(name, { name, value, options })
    }),
    delete: vi.fn((name: string) => {
      store.delete(name)
    }),
  }
})

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => cookieJar),
}))

import { createSession, readSession, destroySession, encrypt, decrypt } from './session'

beforeEach(() => {
  process.env.SESSION_SECRET = 'test-session-secret-padding-to-32-characters'
  cookieJar.store.clear()
  cookieJar.get.mockClear()
  cookieJar.set.mockClear()
  cookieJar.delete.mockClear()
})

afterEach(() => {
  delete process.env.SESSION_SECRET
})

describe('encrypt / decrypt', () => {
  it('round-trips a session payload via signed JWT', async () => {
    const payload = { userId: 'u1', roles: ['employee'], permissions: ['leave:read'] }
    const expires = new Date(Date.now() + 60_000)

    const token = await encrypt(payload, expires)
    const decoded = await decrypt(token)

    expect(decoded).toMatchObject(payload)
    expect(decoded?.exp).toBeTypeOf('number')
    expect(decoded?.iat).toBeTypeOf('number')
  })

  it('returns null for an undefined token', async () => {
    expect(await decrypt(undefined)).toBeNull()
  })

  it('returns null for a malformed token', async () => {
    expect(await decrypt('not.a.real.jwt')).toBeNull()
  })

  it('rejects a token signed with a different secret', async () => {
    const token = await encrypt(
      { userId: 'u1', roles: [], permissions: [] },
      new Date(Date.now() + 60_000),
    )

    process.env.SESSION_SECRET = 'a-totally-different-secret-padding-32ch'
    expect(await decrypt(token)).toBeNull()
  })

  it('rejects an expired token', async () => {
    const token = await encrypt(
      { userId: 'u1', roles: [], permissions: [] },
      new Date(Date.now() - 1_000),
    )
    expect(await decrypt(token)).toBeNull()
  })

  it('throws when SESSION_SECRET is not set', async () => {
    delete process.env.SESSION_SECRET
    await expect(
      encrypt({ userId: 'u1', roles: [], permissions: [] }, new Date(Date.now() + 60_000)),
    ).rejects.toThrow(/SESSION_SECRET is not set/)
  })
})

describe('createSession', () => {
  it('writes a signed JWT cookie with secure-by-default flags', async () => {
    await createSession({ userId: 'u1', roles: ['employee'], permissions: ['leave:read'] })

    expect(cookieJar.set).toHaveBeenCalledTimes(1)
    const [name, value, options] = cookieJar.set.mock.calls[0]
    expect(name).toBe('session')
    expect(typeof value).toBe('string')
    expect(value.split('.').length).toBe(3) // header.payload.signature
    expect(options).toMatchObject({
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    })
    expect(options!.expires).toBeInstanceOf(Date)
  })

  it('marks the cookie secure only in production', async () => {
    try {
      vi.stubEnv('NODE_ENV', 'development')
      await createSession({ userId: 'u', roles: [], permissions: [] })
      expect(cookieJar.set.mock.calls[0]![2]!.secure).toBe(false)

      cookieJar.store.clear()
      cookieJar.set.mockClear()
      vi.stubEnv('NODE_ENV', 'production')
      await createSession({ userId: 'u', roles: [], permissions: [] })
      expect(cookieJar.set.mock.calls[0]![2]!.secure).toBe(true)
    } finally {
      vi.unstubAllEnvs()
    }
  })
})

describe('readSession', () => {
  it('returns the payload after createSession', async () => {
    const payload = { userId: 'u1', roles: ['manager'], permissions: ['leave:approve'] }
    await createSession(payload)

    const result = await readSession()
    expect(result).toMatchObject(payload)
  })

  it('returns null when no session cookie is set', async () => {
    expect(await readSession()).toBeNull()
  })

  it('returns null when the cookie holds a garbage value', async () => {
    cookieJar.store.set('session', { name: 'session', value: 'garbage' })
    expect(await readSession()).toBeNull()
  })
})

describe('destroySession', () => {
  it('deletes the session cookie', async () => {
    await createSession({ userId: 'u1', roles: [], permissions: [] })
    expect(cookieJar.store.has('session')).toBe(true)

    await destroySession()
    expect(cookieJar.delete).toHaveBeenCalledWith('session')
    expect(cookieJar.store.has('session')).toBe(false)
  })
})
