'use client'

import { useActionState } from 'react'
import { loginAction, type LoginState } from '@/lib/modules/auth/actions'
import { Button } from '@/lib/ui/Button'
import { Field, Input } from '@/lib/ui/Input'

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, undefined)
  const mfaPhase = Boolean(state?.mfaRequired)

  return (
    <form action={action} className="space-y-4">
      <Field label="Email" error={state?.fieldErrors?.email?.[0]}>
        <Input name="email" type="email" autoComplete="email" required readOnly={mfaPhase} />
      </Field>
      <Field label="Password" error={state?.fieldErrors?.password?.[0]}>
        <Input name="password" type="password" autoComplete="current-password" required readOnly={mfaPhase} />
      </Field>
      {mfaPhase && (
        <Field label="6-digit code" error={state?.fieldErrors?.code?.[0]} hint="From your authenticator app">
          <Input
            name="code"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            autoComplete="one-time-code"
            autoFocus
            required
            placeholder="123456"
          />
        </Field>
      )}
      {state?.error && <p className="text-sm text-rose-600">{state.error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? 'Signing in…' : mfaPhase ? 'Verify code' : 'Sign in'}
      </Button>
    </form>
  )
}
