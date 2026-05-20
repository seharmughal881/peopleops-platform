import { FloatingDecor } from '@/lib/ui/FloatingDecor'
import { LoginForm } from './LoginForm'
import { LocaleSwitch } from './LocaleSwitch'
import { isProviderEnabled } from '@/lib/modules/auth/oidc'
import { isSamlEnabled } from '@/lib/modules/auth/saml'
import { getLocale, getDictionary } from '@/lib/i18n'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const [locale, dict, params] = await Promise.all([
    getLocale(),
    getDictionary(),
    searchParams,
  ])
  const t = dict.login
  const ssoErrors = t.ssoErrors as Record<string, string>
  const ssoErrorKey = typeof params.sso_error === 'string' ? params.sso_error : null
  const ssoError = ssoErrorKey ? ssoErrors[ssoErrorKey] ?? ssoErrors.generic : null
  const next = typeof params.next === 'string' ? params.next : null

  const nextQs = next ? `?next=${encodeURIComponent(next)}` : ''
  const googleEnabled = isProviderEnabled('google')
  const microsoftEnabled = isProviderEnabled('microsoft')
  const samlEnabled = isSamlEnabled()
  const anySsoEnabled = googleEnabled || microsoftEnabled || samlEnabled

  return (
    <div className="bg-ambient relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <FloatingDecor />
      <div className="absolute top-4 right-4 z-20">
        <LocaleSwitch current={locale} labels={dict.locale} />
      </div>
      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="brand-mark mb-5 flex size-14 items-center justify-center rounded-2xl text-lg font-semibold tracking-tight text-accent-foreground">
            HR
          </span>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            {t.title}
          </h1>
          <p className="mt-1 text-sm text-foreground-muted">
            {t.subtitle}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface/90 p-6 shadow-xs backdrop-blur-sm">
          {ssoError && (
            <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {ssoError}
            </div>
          )}

          {anySsoEnabled && (
            <>
              <div className="space-y-2">
                {googleEnabled && (
                  <a
                    href={`/api/auth/oidc/google/start${nextQs}`}
                    className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted"
                  >
                    <GoogleGlyph />
                    {t.continueWithGoogle}
                  </a>
                )}
                {microsoftEnabled && (
                  <a
                    href={`/api/auth/oidc/microsoft/start${nextQs}`}
                    className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted"
                  >
                    <MicrosoftGlyph />
                    {t.continueWithMicrosoft}
                  </a>
                )}
                {samlEnabled && (
                  <a
                    href={`/api/auth/saml/login${nextQs}`}
                    className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted"
                  >
                    <SamlGlyph />
                    {t.continueWithSaml}
                  </a>
                )}
              </div>
              <div className="my-4 flex items-center gap-3 text-xs text-foreground-muted">
                <span className="h-px flex-1 bg-border" />
                <span>{t.or}</span>
                <span className="h-px flex-1 bg-border" />
              </div>
            </>
          )}

          <LoginForm
            labels={{
              email: t.emailLabel,
              password: t.passwordLabel,
              submit: t.submit,
              submitting: t.submitting,
              mfaLabel: t.mfaLabel,
              mfaHint: t.mfaHint,
              mfaSubmit: t.mfaSubmit,
            }}
          />
        </div>

        <div className="mt-4 rounded-md border border-dashed border-border bg-surface-muted/80 px-4 py-3 text-xs text-foreground-muted backdrop-blur-sm">
          <p className="mb-1 font-semibold text-foreground">Dev credentials</p>
          <p className="font-mono">admin@example.com / admin123</p>
          <p className="font-mono">employee@example.com / employee123</p>
        </div>
      </div>
    </div>
  )
}

function GoogleGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4">
      <path d="M22.5 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.08-1.92 3.22-4.74 3.22-8.3z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.75c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.99 10.99 0 0 0 12 23z" fill="#34A853" />
      <path d="M5.84 14.12c-.22-.66-.34-1.36-.34-2.12s.12-1.46.34-2.12V7.04H2.18A10.99 10.99 0 0 0 1 12c0 1.78.42 3.46 1.18 4.96l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.07.56 4.21 1.65l3.16-3.16C17.45 2.09 14.97 1 12 1A10.99 10.99 0 0 0 2.18 7.04l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" fill="#EA4335" />
    </svg>
  )
}

function MicrosoftGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 23 23" className="size-4">
      <path d="M1 1h10v10H1z" fill="#F25022" />
      <path d="M12 1h10v10H12z" fill="#7FBA00" />
      <path d="M1 12h10v10H1z" fill="#00A4EF" />
      <path d="M12 12h10v10H12z" fill="#FFB900" />
    </svg>
  )
}

function SamlGlyph() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
    >
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}
