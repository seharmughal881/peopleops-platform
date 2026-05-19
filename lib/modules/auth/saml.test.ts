import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  extractEmail,
  isSamlEnabled,
  loadSamlConfig,
  samlCallbackUrl,
} from './saml'

const SAML_ENV_VARS = [
  'SAML_ENTRY_POINT',
  'SAML_ISSUER',
  'SAML_IDP_CERT',
  'OAUTH_REDIRECT_BASE_URL',
] as const

afterEach(() => {
  vi.unstubAllEnvs()
})

function clearSamlEnv() {
  for (const k of SAML_ENV_VARS) vi.stubEnv(k, '')
}

function setSamlEnv() {
  vi.stubEnv('SAML_ENTRY_POINT', 'https://idp.example.com/sso')
  vi.stubEnv('SAML_ISSUER', 'https://hr.example.com/saml')
  vi.stubEnv('SAML_IDP_CERT', '-----BEGIN CERTIFICATE-----\nMIIB...\n-----END CERTIFICATE-----')
}

describe('loadSamlConfig', () => {
  it('returns null when no env is set', () => {
    clearSamlEnv()
    expect(loadSamlConfig()).toBeNull()
  })

  it('returns null when any one of the three required vars is missing', () => {
    clearSamlEnv()
    vi.stubEnv('SAML_ENTRY_POINT', 'https://idp.example.com/sso')
    vi.stubEnv('SAML_ISSUER', 'https://hr.example.com/saml')
    expect(loadSamlConfig()).toBeNull()
  })

  it('returns config when all three vars are set', () => {
    clearSamlEnv()
    setSamlEnv()
    const cfg = loadSamlConfig()
    expect(cfg).toMatchObject({
      entryPoint: 'https://idp.example.com/sso',
      issuer: 'https://hr.example.com/saml',
      callbackPath: '/api/auth/saml/callback',
    })
    expect(cfg?.idpCert).toContain('BEGIN CERTIFICATE')
  })
})

describe('isSamlEnabled', () => {
  it('reflects loadSamlConfig', () => {
    clearSamlEnv()
    expect(isSamlEnabled()).toBe(false)
    setSamlEnv()
    expect(isSamlEnabled()).toBe(true)
  })
})

describe('samlCallbackUrl', () => {
  const cfg = {
    entryPoint: 'x',
    issuer: 'x',
    idpCert: 'x',
    callbackPath: '/api/auth/saml/callback',
  }

  it('uses OAUTH_REDIRECT_BASE_URL when set, ignoring origin', () => {
    vi.stubEnv('OAUTH_REDIRECT_BASE_URL', 'https://hr.example.com')
    expect(samlCallbackUrl('http://localhost:3000', cfg)).toBe(
      'https://hr.example.com/api/auth/saml/callback',
    )
  })

  it('strips a trailing slash from OAUTH_REDIRECT_BASE_URL', () => {
    vi.stubEnv('OAUTH_REDIRECT_BASE_URL', 'https://hr.example.com/')
    expect(samlCallbackUrl('http://localhost:3000', cfg)).toBe(
      'https://hr.example.com/api/auth/saml/callback',
    )
  })

  it('falls back to request origin when OAUTH_REDIRECT_BASE_URL is unset', () => {
    vi.stubEnv('OAUTH_REDIRECT_BASE_URL', '')
    expect(samlCallbackUrl('http://localhost:3000', cfg)).toBe(
      'http://localhost:3000/api/auth/saml/callback',
    )
  })
})

describe('extractEmail', () => {
  it('reads profile.email and lowercases it', () => {
    expect(extractEmail({ email: 'Alice@Example.COM' })).toBe('alice@example.com')
  })

  it('reads profile.mail when email is absent', () => {
    expect(extractEmail({ mail: 'bob@example.com' })).toBe('bob@example.com')
  })

  it('reads the WS-Federation emailaddress claim', () => {
    expect(
      extractEmail({
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress':
          'carol@example.com',
      }),
    ).toBe('carol@example.com')
  })

  it('reads the urn:oid mail attribute', () => {
    expect(
      extractEmail({ 'urn:oid:0.9.2342.19200300.100.1.3': 'dave@example.com' }),
    ).toBe('dave@example.com')
  })

  it('ignores non-string and non-email-shaped values', () => {
    expect(extractEmail({ email: 12345 })).toBeNull()
    expect(extractEmail({ email: 'not-an-email' })).toBeNull()
  })

  it('falls back to NameID when format is emailAddress', () => {
    expect(
      extractEmail({
        nameID: 'eve@example.com',
        nameIDFormat:
          'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
      }),
    ).toBe('eve@example.com')
  })

  it('falls back to NameID when format is unspecified but value looks like an email', () => {
    expect(
      extractEmail({
        nameID: 'frank@example.com',
        nameIDFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified',
      }),
    ).toBe('frank@example.com')
  })

  it('does NOT fall back to NameID when format is a non-email format', () => {
    expect(
      extractEmail({
        nameID: 'somebody@example.com',
        nameIDFormat: 'urn:oasis:names:tc:SAML:2.0:nameid-format:persistent',
      }),
    ).toBeNull()
  })

  it('returns null when nothing matches', () => {
    expect(extractEmail({})).toBeNull()
    expect(extractEmail({ nameID: 'no-at-symbol' })).toBeNull()
  })

  it('prefers profile.email over profile.mail', () => {
    expect(extractEmail({ email: 'primary@x.com', mail: 'secondary@x.com' })).toBe(
      'primary@x.com',
    )
  })
})
