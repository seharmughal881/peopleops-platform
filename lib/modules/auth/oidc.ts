import 'server-only'
import * as client from 'openid-client'

export const PROVIDERS = ['google', 'microsoft'] as const
export type Provider = (typeof PROVIDERS)[number]

export function isProvider(value: string): value is Provider {
  return (PROVIDERS as readonly string[]).includes(value)
}

export type ProviderConfig = {
  issuer: string
  clientId: string
  clientSecret: string
  scopes: string[]
}

export function loadProviderConfig(provider: Provider): ProviderConfig | null {
  switch (provider) {
    case 'google': {
      const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
      const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
      if (!clientId || !clientSecret) return null
      return {
        issuer: 'https://accounts.google.com',
        clientId,
        clientSecret,
        scopes: ['openid', 'email', 'profile'],
      }
    }
    case 'microsoft': {
      const clientId = process.env.MICROSOFT_OAUTH_CLIENT_ID
      const clientSecret = process.env.MICROSOFT_OAUTH_CLIENT_SECRET
      if (!clientId || !clientSecret) return null
      // "common" lets users from any Azure AD tenant or personal MS account sign in.
      // Set MICROSOFT_OAUTH_TENANT to a tenant GUID to restrict to one org.
      const tenant = process.env.MICROSOFT_OAUTH_TENANT || 'common'
      return {
        issuer: `https://login.microsoftonline.com/${tenant}/v2.0`,
        clientId,
        clientSecret,
        scopes: ['openid', 'email', 'profile'],
      }
    }
  }
}

export function isProviderEnabled(provider: Provider): boolean {
  return loadProviderConfig(provider) !== null
}

let configCache: Partial<Record<Provider, Promise<client.Configuration>>> = {}

export function getConfiguration(provider: Provider): Promise<client.Configuration> {
  const cfg = loadProviderConfig(provider)
  if (!cfg) throw new Error(`OIDC provider "${provider}" is not configured`)
  if (!configCache[provider]) {
    configCache[provider] = client.discovery(
      new URL(cfg.issuer),
      cfg.clientId,
      cfg.clientSecret,
    )
  }
  return configCache[provider]!
}

export function redirectUri(provider: Provider, origin: string): string {
  const base = process.env.OAUTH_REDIRECT_BASE_URL || origin
  return `${base.replace(/\/$/, '')}/api/auth/oidc/${provider}/callback`
}
