import { beforeEach, describe, expect, it, vi } from 'vitest'

const redisMock = vi.hoisted(() => ({
  incr: vi.fn(),
  expire: vi.fn(),
  ttl: vi.fn(),
  del: vi.fn(),
  on: vi.fn(),
}))

vi.mock('ioredis', () => ({
  default: class FakeIORedis {
    incr = redisMock.incr
    expire = redisMock.expire
    ttl = redisMock.ttl
    del = redisMock.del
    on = redisMock.on
  },
}))

import { check, clearBucket } from './rate-limit'

beforeEach(() => {
  redisMock.incr.mockReset()
  redisMock.expire.mockReset()
  redisMock.ttl.mockReset()
  redisMock.del.mockReset()
  redisMock.on.mockReset()
})

describe('check', () => {
  it('allows the first request and sets TTL on the new bucket', async () => {
    redisMock.incr.mockResolvedValue(1)
    redisMock.expire.mockResolvedValue(1)
    redisMock.ttl.mockResolvedValue(60)

    const result = await check('login:ip:1.2.3.4', 5, 60)

    expect(result).toEqual({ allowed: true, remaining: 4, resetSeconds: 60 })
    expect(redisMock.incr).toHaveBeenCalledWith('rl:login:ip:1.2.3.4')
    expect(redisMock.expire).toHaveBeenCalledWith('rl:login:ip:1.2.3.4', 60)
  })

  it('does not re-set TTL on subsequent requests in the window', async () => {
    redisMock.incr.mockResolvedValue(3)
    redisMock.ttl.mockResolvedValue(40)

    const result = await check('login:ip:1.2.3.4', 5, 60)

    expect(result).toEqual({ allowed: true, remaining: 2, resetSeconds: 40 })
    expect(redisMock.expire).not.toHaveBeenCalled()
  })

  it('blocks requests over the limit and reports zero remaining', async () => {
    redisMock.incr.mockResolvedValue(10)
    redisMock.ttl.mockResolvedValue(20)

    const result = await check('login:ip:1.2.3.4', 5, 60)

    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
    expect(result.resetSeconds).toBe(20)
  })

  it('allows exactly max requests, blocks the next', async () => {
    redisMock.incr.mockResolvedValue(5)
    redisMock.ttl.mockResolvedValue(30)
    expect((await check('b', 5, 60)).allowed).toBe(true)

    redisMock.incr.mockResolvedValue(6)
    redisMock.ttl.mockResolvedValue(30)
    expect((await check('b', 5, 60)).allowed).toBe(false)
  })

  it('falls back to windowSeconds when ttl is missing (-1/-2)', async () => {
    redisMock.incr.mockResolvedValue(2)
    redisMock.ttl.mockResolvedValue(-2)

    const result = await check('b', 5, 60)

    expect(result.resetSeconds).toBe(60)
  })

  it('fails OPEN when Redis throws (outage must not lock everyone out)', async () => {
    redisMock.incr.mockRejectedValue(new Error('ECONNREFUSED'))

    const result = await check('login:ip:1.2.3.4', 5, 60)

    expect(result).toEqual({ allowed: true, remaining: 5, resetSeconds: 60 })
  })
})

describe('clearBucket', () => {
  it('deletes the bucket key with the rl: prefix', async () => {
    redisMock.del.mockResolvedValue(1)

    await clearBucket('login:email:alice@example.com')

    expect(redisMock.del).toHaveBeenCalledWith('rl:login:email:alice@example.com')
  })

  it('swallows redis errors silently', async () => {
    redisMock.del.mockRejectedValue(new Error('boom'))

    await expect(clearBucket('foo')).resolves.toBeUndefined()
  })
})
