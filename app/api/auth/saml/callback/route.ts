import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { createSession } from '@/lib/modules/auth/session'
import { loadUserPermissions } from '@/lib/modules/auth/dal'
import { recordAudit } from '@/lib/modules/audit'
import { extractEmail, getSaml, isSamlEnabled } from '@/lib/modules/auth/saml'

export const dynamic = 'force-dynamic'

function err(reason: string, next?: string): NextResponse {
  const url = new URL('/login', process.env.OAUTH_REDIRECT_BASE_URL || 'http://localhost:3000')
  url.searchParams.set('sso_error', reason)
  if (next) url.searchParams.set('next', next)
  return NextResponse.redirect(url)
}

export async function POST(req: NextRequest) {
  if (!isSamlEnabled()) {
    return NextResponse.json({ error: 'SAML SSO not configured' }, { status: 503 })
  }

  const form = await req.formData()
  const samlResponse = form.get('SAMLResponse')
  const relayStateRaw = form.get('RelayState')
  if (typeof samlResponse !== 'string') return err('missing_saml_response')

  const relayState = typeof relayStateRaw === 'string' ? relayStateRaw : ''
  const next =
    relayState.startsWith('/') && !relayState.startsWith('//') ? relayState : '/dashboard'

  const saml = getSaml(req.nextUrl.origin)
  let profile: Record<string, unknown> | null
  try {
    const result = await saml.validatePostResponseAsync({
      SAMLResponse: samlResponse,
      RelayState: relayState,
    })
    profile = result.profile as Record<string, unknown> | null
  } catch (e) {
    console.error('SAML response validation failed', e)
    return err('saml_validation_failed', next)
  }
  if (!profile) return err('no_claims', next)

  const nameId = typeof profile.nameID === 'string' ? profile.nameID : null
  if (!nameId) return err('no_claims', next)
  const email = extractEmail(profile)

  const provider = 'saml'
  let linked = await prisma.oAuthAccount.findUnique({
    where: { provider_providerSub: { provider, providerSub: nameId } },
    include: { user: true },
  })

  let user = linked?.user ?? null

  if (!user) {
    // SAML assertion came from a trusted IdP we provisioned by env var, so we treat
    // the email it asserts as verified (the IdP owns the user directory).
    if (!email) return err('email_not_verified', next)

    const byEmail = await prisma.user.findUnique({ where: { email } })
    if (!byEmail) return err('no_account_for_email', next)
    if (byEmail.status !== 'active') return err('account_inactive', next)

    linked = await prisma.oAuthAccount.create({
      data: { userId: byEmail.id, provider, providerSub: nameId, email },
      include: { user: true },
    })
    user = byEmail

    await recordAudit({
      userId: user.id,
      action: 'auth.saml.linked',
      entityType: 'OAuthAccount',
      entityId: linked.id,
      after: { provider },
    })
  }

  if (user.status !== 'active') return err('account_inactive', next)

  await prisma.oAuthAccount.update({
    where: { id: linked!.id },
    data: { lastUsedAt: new Date(), email: email ?? linked!.email },
  })

  const { roles, permissions } = await loadUserPermissions(user.id)
  await createSession({ userId: user.id, roles, permissions })

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
  await recordAudit({
    userId: user.id,
    action: 'auth.saml.login',
    entityType: 'User',
    entityId: user.id,
    after: { provider },
  })

  return NextResponse.redirect(new URL(next, req.nextUrl.origin))
}
