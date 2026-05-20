// English (base) dictionary. Keep keys in sync with ./ur.ts and any other
// locale files; missing keys fall back to English via the TS type.

const en = {
  locale: {
    english: 'English',
    urdu: 'اردو',
    switchTo: 'Switch language',
  },
  login: {
    title: 'Sign in to HR System',
    subtitle: 'Welcome back — enter your credentials to continue.',
    emailLabel: 'Email',
    passwordLabel: 'Password',
    submit: 'Sign in',
    submitting: 'Signing in…',
    mfaLabel: '6-digit code',
    mfaHint: 'From your authenticator app',
    mfaSubmit: 'Verify code',
    or: 'or',
    continueWithGoogle: 'Continue with Google',
    continueWithMicrosoft: 'Continue with Microsoft',
    continueWithSaml: 'Continue with SSO',
    ssoErrors: {
      missing_flow_state: 'Sign-in session expired. Please try again.',
      bad_flow_state: 'Sign-in session was malformed. Please try again.',
      token_exchange_failed: "Couldn't complete single sign-on. Please try again.",
      no_claims: 'Identity provider did not return profile information.',
      email_not_verified: 'Your SSO email is not verified — sign in with a password instead.',
      no_account_for_email: 'No HR account exists for that email. Ask an admin to create one.',
      account_inactive: 'That account is inactive. Contact an administrator.',
      missing_saml_response: 'No SAML response received. Please retry from your IdP.',
      saml_validation_failed: "Couldn't validate the SAML response. Contact an administrator.",
      generic: 'Sign-in failed.',
    },
  },
}

export default en
// Widen string-literal types so other locales can supply different strings
// while keeping the same key structure.
type Loosen<T> = T extends string
  ? string
  : T extends readonly unknown[]
    ? { [K in keyof T]: Loosen<T[K]> }
    : T extends object
      ? { [K in keyof T]: Loosen<T[K]> }
      : T
export type Dictionary = Loosen<typeof en>
