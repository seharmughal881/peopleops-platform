import { prisma } from '@/lib/db/client'
import IORedis from 'ioredis'

export const dynamic = 'force-dynamic'

export async function GET() {
  const checks: Record<string, { ok: boolean; error?: string }> = {}

  try {
    await prisma.$queryRaw`SELECT 1`
    checks.db = { ok: true }
  } catch (e) {
    checks.db = { ok: false, error: e instanceof Error ? e.message : 'unknown' }
  }

  try {
    const redis = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      connectTimeout: 1500,
    })
    await redis.connect()
    const pong = await redis.ping()
    await redis.quit()
    checks.redis = { ok: pong === 'PONG' }
  } catch (e) {
    checks.redis = { ok: false, error: e instanceof Error ? e.message : 'unknown' }
  }

  const allOk = Object.values(checks).every((c) => c.ok)
  return Response.json({ ok: allOk, checks }, { status: allOk ? 200 : 503 })
}
