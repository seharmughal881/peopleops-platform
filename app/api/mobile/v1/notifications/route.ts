import { NextResponse, type NextRequest } from 'next/server'
import { authenticateMobile, unauthorized } from '@/lib/modules/auth/mobile'
import { listForUser, markRead } from '@/lib/modules/notifications'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await authenticateMobile(req.headers)
  if (!auth.ok) return unauthorized(auth.status, auth.error)

  const url = new URL(req.url)
  const unreadOnly = url.searchParams.get('unreadOnly') === 'true'
  const limit = Number(url.searchParams.get('limit') ?? 20)

  const notifications = await listForUser(auth.user.id, { unreadOnly, limit })
  return NextResponse.json({ notifications })
}

export async function POST(req: NextRequest) {
  const auth = await authenticateMobile(req.headers)
  if (!auth.ok) return unauthorized(auth.status, auth.error)

  const body = await req.json().catch(() => ({}))
  const ids = Array.isArray(body.ids) ? body.ids.filter((x: unknown): x is string => typeof x === 'string') : []
  if (ids.length === 0) return NextResponse.json({ error: 'ids required' }, { status: 400 })

  await markRead(auth.user.id, ids)
  return NextResponse.json({ ok: true, count: ids.length })
}
