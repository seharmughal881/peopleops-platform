import { NextRequest, NextResponse } from 'next/server'
import { decrypt } from '@/lib/modules/auth/session'

const PUBLIC_ROUTES = ['/login', '/forgot-password']
const STATIC_PREFIXES = [
  '/_next',
  '/api/webhooks',
  '/api/health',
  '/api/mobile',
  '/api/integrations/biometric',
  '/api/auth/oidc',
  '/favicon',
  '/file.svg',
  '/globe.svg',
  '/next.svg',
  '/vercel.svg',
  '/window.svg',
]

function buildCsp(nonce: string, isDev: boolean): string {
  const scriptSrc = `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`
  // HMR injects inline <style> tags in dev — nonces can't be threaded through every one,
  // so we relax style-src in dev only. Prod still uses nonced styles.
  const styleSrc = isDev
    ? `style-src 'self' 'unsafe-inline'`
    : `style-src 'self' 'nonce-${nonce}'`

  return [
    `default-src 'self'`,
    scriptSrc,
    styleSrc,
    `img-src 'self' blob: data:`,
    `font-src 'self'`,
    `connect-src 'self'`,
    `frame-ancestors 'none'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `upgrade-insecure-requests`,
  ].join('; ')
}

function applySecurityHeaders(
  res: NextResponse,
  csp: string,
  isProd: boolean,
): NextResponse {
  res.headers.set('Content-Security-Policy', csp)
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(self), interest-cohort=()',
  )
  if (isProd) {
    res.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload',
    )
  }
  return res
}

export default async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname
  const isDev = process.env.NODE_ENV === 'development'
  const isProd = process.env.NODE_ENV === 'production'

  if (STATIC_PREFIXES.some((p) => path.startsWith(p))) {
    return NextResponse.next()
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const csp = buildCsp(nonce, isDev)

  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', csp)

  const token = req.cookies.get('session')?.value
  const session = await decrypt(token)

  const isPublic = PUBLIC_ROUTES.some((p) => path === p || path.startsWith(`${p}/`))

  if (!session?.userId && !isPublic) {
    const url = new URL('/login', req.nextUrl)
    if (path !== '/') url.searchParams.set('next', path)
    return applySecurityHeaders(NextResponse.redirect(url), csp, isProd)
  }

  if (session?.userId && isPublic) {
    return applySecurityHeaders(
      NextResponse.redirect(new URL('/dashboard', req.nextUrl)),
      csp,
      isProd,
    )
  }

  if (path === '/' && session?.userId) {
    return applySecurityHeaders(
      NextResponse.redirect(new URL('/dashboard', req.nextUrl)),
      csp,
      isProd,
    )
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  return applySecurityHeaders(response, csp, isProd)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico)$).*)'],
}
