import 'server-only'
import { SAML, type SamlConfig } from '@node-saml/node-saml'

export type SamlConfigured = {
  entryPoint: string
  issuer: string
  idpCert: string
  callbackPath: string
}

export function loadSamlConfig(): SamlConfigured | null {
  const entryPoint = process.env.SAML_ENTRY_POINT
  const issuer = process.env.SAML_ISSUER
  const idpCert = process.env.SAML_IDP_CERT
  if (!entryPoint || !issuer || !idpCert) return null
  return {
    entryPoint,
    issuer,
    idpCert,
    callbackPath: '/api/auth/saml/callback',
  }
}

export function isSamlEnabled(): boolean {
  return loadSamlConfig() !== null
}

export function samlCallbackUrl(origin: string, cfg: SamlConfigured): string {
  const base = process.env.OAUTH_REDIRECT_BASE_URL || origin
  return `${base.replace(/\/$/, '')}${cfg.callbackPath}`
}

let samlCache: { instance: SAML; callbackUrl: string } | null = null

export function getSaml(origin: string): SAML {
  const cfg = loadSamlConfig()
  if (!cfg) throw new Error('SAML is not configured')
  const callbackUrl = samlCallbackUrl(origin, cfg)
  if (samlCache && samlCache.callbackUrl === callbackUrl) return samlCache.instance

  const opts: SamlConfig = {
    entryPoint: cfg.entryPoint,
    issuer: cfg.issuer,
    idpCert: cfg.idpCert,
    callbackUrl,
    // Default signed assertions for security. IdP must sign the SAML assertion.
    wantAssertionsSigned: true,
    wantAuthnResponseSigned: false,
    // We don't track InResponseTo across instances yet; allow IdP-initiated flows.
    // Tighten to 'always' once we have a shared cache (Redis) backing CacheProvider.
    validateInResponseTo: 'never' as SamlConfig['validateInResponseTo'],
  }

  const instance = new SAML(opts)
  samlCache = { instance, callbackUrl }
  return instance
}

// Try several attribute keys an IdP might use to convey the user's email.
export function extractEmail(profile: Record<string, unknown>): string | null {
  const candidates = [
    profile.email,
    profile.mail,
    profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'],
    profile['urn:oid:0.9.2342.19200300.100.1.3'],
  ]
  for (const v of candidates) {
    if (typeof v === 'string' && v.includes('@')) return v.toLowerCase()
  }
  // Fall back to NameID when it's formatted as an email.
  const nameId = profile.nameID
  const fmt = profile.nameIDFormat
  if (
    typeof nameId === 'string' &&
    nameId.includes('@') &&
    (typeof fmt !== 'string' || fmt.includes('emailAddress') || fmt.includes('unspecified'))
  ) {
    return nameId.toLowerCase()
  }
  return null
}
