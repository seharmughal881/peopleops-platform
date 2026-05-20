'use client'

import { useActionState } from 'react'
import { loginAction, type LoginState } from '@/lib/modules/auth/actions'
import { Button } from '@/lib/ui/Button'
import { Field, Input } from '@/lib/ui/Input'

export interface LoginFormLabels {
  email: string
  password: string
  submit: string
  submitting: string
  mfaLabel: string
  mfaHint: string
  mfaSubmit: string
}

export function LoginForm({ labels }: { labels: LoginFormLabels }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, undefined)
  const mfaPhase = Boolean(state?.mfaRequired)

  return (
    <form action={action} className="space-y-4">
      <Field label={labels.email} error={state?.fieldErrors?.email?.[0]}>
        <Input name="email" type="email" autoComplete="email" required readOnly={mfaPhase} />
      </Field>
      <Field label={labels.password} error={state?.fieldErrors?.password?.[0]}>
        <Input name="password" type="password" autoComplete="current-password" required readOnly={mfaPhase} />
      </Field>
      {mfaPhase && (
        <Field label={labels.mfaLabel} error={state?.fieldErrors?.code?.[0]} hint={labels.mfaHint}>
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
        {pending ? labels.submitting : mfaPhase ? labels.mfaSubmit : labels.submit}
      </Button>
    </form>
  )
}
