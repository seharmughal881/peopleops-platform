import IORedis from 'ioredis'

let redis: IORedis | undefined
function client(): IORedis {
  if (!redis) {
    redis = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
      maxRetriesPerRequest: 2,
      lazyConnect: false,
      enableOfflineQueue: false,
    })
    redis.on('error', () => {
      // swallow — `check()` returns allowed=true on Redis failure (fail-open) so login still works.
    })
  }
  return redis
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetSeconds: number
}

/**
 * Sliding-window rate limit using INCR + EXPIRE.
 * - bucket: scope key (e.g. `login:ip:1.2.3.4` or `login:email:alice@example.com`)
 * - max: max attempts per window
 * - windowSeconds: window length
 *
 * Fails OPEN on Redis errors so a Redis outage doesn't lock everyone out.
 */
export async function check(bucket: string, max: number, windowSeconds: number): Promise<RateLimitResult> {
  try {
    const key = `rl:${bucket}`
    const r = client()
    const count = await r.incr(key)
    if (count === 1) await r.expire(key, windowSeconds)
    const ttl = await r.ttl(key)
    return {
      allowed: count <= max,
      remaining: Math.max(0, max - count),
      resetSeconds: ttl > 0 ? ttl : windowSeconds,
    }
  } catch {
    return { allowed: true, remaining: max, resetSeconds: windowSeconds }
  }
}

export async function clearBucket(bucket: string): Promise<void> {
  try {
    await client().del(`rl:${bucket}`)
  } catch {
    // ignore
  }
}
