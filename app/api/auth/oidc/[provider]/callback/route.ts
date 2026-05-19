import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import * as client from 'openid-client'
import { prisma } from '@/lib/db/client'
import { createSession } from '@/lib/modules/auth/session'
import { loadUserPermissions } from '@/lib/modules/auth/dal'
import { recordAudit } from '@/lib/modules/audit'
import {
  getConfiguration,
  isProvider,
  isProviderEnabled,
  type Provider,
} from '@/lib/modules/auth/oidc'

export const dynamic = 'force-dynamic'

type FlowState = {
  state: string
  nonce: string
  codeVerifier: string
  next: string
}

function err(reason: string, next?: string): NextResponse {
  const url = new URL('/login', process.env.OAUTH_REDIRECT_BASE_URL || 'http://localhost:3000')
  url.searchParams.set('sso_error', reason)
  if (next) url.searchParams.set('next', next)
  return NextResponse.redirect(url)
}

export async function GET(
  req: NextRequest,
  ctx: RouteContext<'/api/auth/oidc/[provider]/callback'>,
) {
  const { provider: providerRaw } = await ctx.params
  if (!isProvider(providerRaw)) {
    return NextResponse.json({ error: 'Unknown provider' }, { status: 404 })
  }
  const provider: Provider = providerRaw
  if (!isProviderEnabled(provider)) {
    return NextResponse.json({ error: `${provider} SSO not configured` }, { status: 503 })
  }

  const cookieName = `oidc_${provider}_flow`
  const jar = await cookies()
  const raw = jar.get(cookieName)?.value
  if (!raw) return err('missing_flow_state')

  let flow: FlowState
  try {
    flow = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as FlowState
  } catch {
    return err('bad_flow_state')
  }
  jar.delete(cookieName)

  const config = await getConfiguration(provider)

  let tokens: Awaited<ReturnType<typeof client.authorizationCodeGrant>>
  try {
    tokens = await client.authorizationCodeGrant(config, new URL(req.url), {
      pkceCodeVerifier: flow.codeVerifier,
      expectedState: flow.state,
      expectedNonce: flow.nonce,
    })
  } catch (e) {
    console.error(`OIDC token exchange failed (${provider})`, e)
    return err('token_exchange_failed', flow.next)
  }

  const claims = tokens.claims()
  if (!claims) return err('no_claims', flow.next)
  const sub = claims.sub
  const email = typeof claims.email === 'string' ? claims.email.toLowerCase() : null
  // Microsoft's v2.0 endpoint may omit `email_verified`. Azure AD work accounts
  // are domain-controlled by the tenant admin, so we treat them as verified.
  // Google always sends `email_verified`.
  const emailVerified =
    claims.email_verified === true || (provider === 'microsoft' && !!email)

  let linked = await prisma.oAuthAccount.findUnique({
    where: { provider_providerSub: { provider, providerSub: sub } },
    include: { user: true },
  })

  let user = linked?.user ?? null

  if (!user) {
    if (!email || !emailVerified) return err('email_not_verified', flow.next)

    const byEmail = await prisma.user.findUnique({ where: { email } })
    if (!byEmail) return err('no_account_for_email', flow.next)
    if (byEmail.status !== 'active') return err('account_inactive', flow.next)

    linked = await prisma.oAuthAccount.create({
      data: { userId: byEmail.id, provider, providerSub: sub, email },
      include: { user: true },
    })
    user = byEmail

    await recordAudit({
      userId: user.id,
      action: 'auth.oidc.linked',
      entityType: 'OAuthAccount',
      entityId: linked.id,
      after: { provider },
    })
  }

  if (user.status !== 'active') return err('account_inactive', flow.next)

  await prisma.oAuthAccount.update({
    where: { id: linked!.id },
    data: { lastUsedAt: new Date(), email: email ?? linked!.email },
  })

  const { roles, permissions } = await loadUserPermissions(user.id)
  await createSession({ userId: user.id, roles, permissions })

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
  await recordAudit({
    userId: user.id,
    action: 'auth.oidc.login',
    entityType: 'User',
    entityId: user.id,
    after: { provider },
  })

  return NextResponse.redirect(new URL(flow.next, req.nextUrl.origin))
}
