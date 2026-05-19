import { NextResponse, type NextRequest } from 'next/server'
import { authenticateMobile, unauthorized } from '@/lib/modules/auth/mobile'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await authenticateMobile(req.headers)
  if (!auth.ok) return unauthorized(auth.status, auth.error)

  return NextResponse.json({
    user: {
      id: auth.user.id,
      email: auth.user.email,
      employee: auth.user.employee,
      roles: auth.user.roles,
      permissions: auth.user.permissions,
    },
  })
}
