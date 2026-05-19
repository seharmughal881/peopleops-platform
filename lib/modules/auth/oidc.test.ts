import { afterEach, describe, expect, it, vi } from 'vitest'
import { isProvider, isProviderEnabled, loadProviderConfig } from './oidc'

const OIDC_ENV_VARS = [
  'GOOGLE_OAUTH_CLIENT_ID',
  'GOOGLE_OAUTH_CLIENT_SECRET',
  'MICROSOFT_OAUTH_CLIENT_ID',
  'MICROSOFT_OAUTH_CLIENT_SECRET',
  'MICROSOFT_OAUTH_TENANT',
] as const

afterEach(() => {
  vi.unstubAllEnvs()
})

function clearOidcEnv() {
  for (const k of OIDC_ENV_VARS) vi.stubEnv(k, '')
}

describe('isProvider', () => {
  it('accepts known OIDC providers', () => {
    expect(isProvider('google')).toBe(true)
    expect(isProvider('microsoft')).toBe(true)
  })

  it('rejects SAML — SAML is not an OIDC provider', () => {
    expect(isProvider('saml')).toBe(false)
  })

  it('rejects unknown values', () => {
    expect(isProvider('')).toBe(false)
    expect(isProvider('okta')).toBe(false)
    expect(isProvider('GOOGLE')).toBe(false)
  })
})

describe('loadProviderConfig(google)', () => {
  it('returns null when client credentials are not set', () => {
    clearOidcEnv()
    expect(loadProviderConfig('google')).toBeNull()
  })

  it('returns null when only one credential is set', () => {
    clearOidcEnv()
    vi.stubEnv('GOOGLE_OAUTH_CLIENT_ID', 'cid')
    expect(loadProviderConfig('google')).toBeNull()
  })

  it('returns the Google issuer and scopes when configured', () => {
    clearOidcEnv()
    vi.stubEnv('GOOGLE_OAUTH_CLIENT_ID', 'cid')
    vi.stubEnv('GOOGLE_OAUTH_CLIENT_SECRET', 'csec')
    const cfg = loadProviderConfig('google')
    expect(cfg).toEqual({
      issuer: 'https://accounts.google.com',
      clientId: 'cid',
      clientSecret: 'csec',
      scopes: ['openid', 'email', 'profile'],
    })
  })
})

describe('loadProviderConfig(microsoft)', () => {
  it('returns null when client credentials are not set', () => {
    clearOidcEnv()
    expect(loadProviderConfig('microsoft')).toBeNull()
  })

  it('defaults the tenant to "common" when MICROSOFT_OAUTH_TENANT is unset', () => {
    clearOidcEnv()
    vi.stubEnv('MICROSOFT_OAUTH_CLIENT_ID', 'cid')
    vi.stubEnv('MICROSOFT_OAUTH_CLIENT_SECRET', 'csec')
    const cfg = loadProviderConfig('microsoft')
    expect(cfg?.issuer).toBe('https://login.microsoftonline.com/common/v2.0')
  })

  it('uses the explicit tenant when MICROSOFT_OAUTH_TENANT is set', () => {
    clearOidcEnv()
    vi.stubEnv('MICROSOFT_OAUTH_CLIENT_ID', 'cid')
    vi.stubEnv('MICROSOFT_OAUTH_CLIENT_SECRET', 'csec')
    vi.stubEnv('MICROSOFT_OAUTH_TENANT', 'contoso.onmicrosoft.com')
    const cfg = loadProviderConfig('microsoft')
    expect(cfg?.issuer).toBe(
      'https://login.microsoftonline.com/contoso.onmicrosoft.com/v2.0',
    )
  })

  it('returns the expected scopes', () => {
    clearOidcEnv()
    vi.stubEnv('MICROSOFT_OAUTH_CLIENT_ID', 'cid')
    vi.stubEnv('MICROSOFT_OAUTH_CLIENT_SECRET', 'csec')
    expect(loadProviderConfig('microsoft')?.scopes).toEqual([
      'openid',
      'email',
      'profile',
    ])
  })
})

describe('isProviderEnabled', () => {
  it('is false when env is unset', () => {
    clearOidcEnv()
    expect(isProviderEnabled('google')).toBe(false)
    expect(isProviderEnabled('microsoft')).toBe(false)
  })

  it('is true once both client id and secret are set', () => {
    clearOidcEnv()
    vi.stubEnv('GOOGLE_OAUTH_CLIENT_ID', 'cid')
    vi.stubEnv('GOOGLE_OAUTH_CLIENT_SECRET', 'csec')
    expect(isProviderEnabled('google')).toBe(true)
    expect(isProviderEnabled('microsoft')).toBe(false)
  })
})
