import { NextRequest, NextResponse } from 'next/server'
import { decrypt } from '@/lib/modules/auth/session'

const PUBLIC_ROUTES = ['/login', '/forgot-password']
const STATIC_PREFIXES = ['/_next', '/api/webhooks', '/api/health', '/api/mobile', '/api/integrations/biometric', '/api/auth/oidc', '/favicon', '/file.svg', '/globe.svg', '/next.svg', '/vercel.svg', '/window.svg']

export default async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname

  if (STATIC_PREFIXES.some((p) => path.startsWith(p))) {
    return NextResponse.next()
  }

  const token = req.cookies.get('session')?.value
  const session = await decrypt(token)

  const isPublic = PUBLIC_ROUTES.some((p) => path === p || path.startsWith(`${p}/`))

  if (!session?.userId && !isPublic) {
    const url = new URL('/login', req.nextUrl)
    if (path !== '/') url.searchParams.set('next', path)
    return NextResponse.redirect(url)
  }

  if (session?.userId && isPublic) {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
  }

  if (path === '/' && session?.userId) {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico)$).*)'],
}
