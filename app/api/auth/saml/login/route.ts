import { NextRequest, NextResponse } from 'next/server'
import { getSaml, isSamlEnabled } from '@/lib/modules/auth/saml'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!isSamlEnabled()) {
    return NextResponse.json({ error: 'SAML SSO not configured' }, { status: 503 })
  }

  const nextRaw = req.nextUrl.searchParams.get('next') ?? '/dashboard'
  const next = nextRaw.startsWith('/') && !nextRaw.startsWith('//') ? nextRaw : '/dashboard'

  const saml = getSaml(req.nextUrl.origin)
  // RelayState is echoed back by the IdP — use it to carry the post-login redirect.
  const url = await saml.getAuthorizeUrlAsync(next, undefined, {})
  return NextResponse.redirect(url)
}
