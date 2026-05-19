import { NextResponse, type NextRequest } from 'next/server'
import { authenticateMobile, unauthorized } from '@/lib/modules/auth/mobile'
import { latestAnnouncements } from '@/lib/modules/comms'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await authenticateMobile(req.headers)
  if (!auth.ok) return unauthorized(auth.status, auth.error)

  const limit = Math.min(Number(new URL(req.url).searchParams.get('limit') ?? 10), 50)
  const announcements = await latestAnnouncements(limit)
  return NextResponse.json({ announcements })
}
