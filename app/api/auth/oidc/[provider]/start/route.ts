import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import * as client from 'openid-client'
import {
  getConfiguration,
  isProvider,
  isProviderEnabled,
  loadProviderConfig,
  redirectUri,
} from '@/lib/modules/auth/oidc'

export const dynamic = 'force-dynamic'

type FlowState = {
  state: string
  nonce: string
  codeVerifier: string
  next: string
}

export async function GET(
  req: NextRequest,
  ctx: RouteContext<'/api/auth/oidc/[provider]/start'>,
) {
  const { provider } = await ctx.params
  if (!isProvider(provider)) {
    return NextResponse.json({ error: 'Unknown provider' }, { status: 404 })
  }
  if (!isProviderEnabled(provider)) {
    return NextResponse.json({ error: `${provider} SSO not configured` }, { status: 503 })
  }

  const config = await getConfiguration(provider)
  const providerCfg = loadProviderConfig(provider)!

  const codeVerifier = client.randomPKCECodeVerifier()
  const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier)
  const state = client.randomState()
  const nonce = client.randomNonce()

  // Validate `next` param to prevent open-redirect attacks
  const nextRaw = req.nextUrl.searchParams.get('next') ?? '/dashboard'
  const next = nextRaw.startsWith('/') && !nextRaw.startsWith('//') ? nextRaw : '/dashboard'

  const flow: FlowState = { state, nonce, codeVerifier, next }
  const jar = await cookies()
  jar.set(`oidc_${provider}_flow`, Buffer.from(JSON.stringify(flow)).toString('base64url'), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 10,
  })

  const url = client.buildAuthorizationUrl(config, {
    redirect_uri: redirectUri(provider, req.nextUrl.origin),
    scope: providerCfg.scopes.join(' '),
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
    nonce,
  })

  return NextResponse.redirect(url.toString())
}
