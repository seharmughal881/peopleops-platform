'use client'

import { useRef } from 'react'
import { changePasswordAction, type ChangePasswordState } from '@/lib/modules/auth/actions'
import { Button } from '@/lib/ui/Button'
import { Field, Input } from '@/lib/ui/Input'
import { Form, fieldError, useActionForm } from '@/lib/ui/Form'

async function action(
  prev: ChangePasswordState | undefined,
  formData: FormData,
): Promise<ChangePasswordState> {
  return changePasswordAction(prev, formData)
}

export function ChangePasswordForm() {
  const formRef = useRef<HTMLFormElement>(null)
  const { state, dispatch, pending } = useActionForm(action, {
    successMessage: 'Password updated',
    onSuccess: () => formRef.current?.reset(),
  })

  return (
    <Form ref={formRef} action={dispatch} pending={pending} className="space-y-4">
      <Field
        label="Current password"
        required
        error={fieldError(state, 'currentPassword')}
      >
        <Input
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          invalid={Boolean(fieldError(state, 'currentPassword'))}
        />
      </Field>
      <Field
        label="New password"
        required
        error={fieldError(state, 'newPassword')}
      >
        <Input
          name="newPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          invalid={Boolean(fieldError(state, 'newPassword'))}
        />
      </Field>
      <Field
        label="Confirm new password"
        required
        error={fieldError(state, 'confirmPassword')}
      >
        <Input
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          invalid={Boolean(fieldError(state, 'confirmPassword'))}
        />
      </Field>
      <p className="text-xs text-foreground-muted">
        Use at least 8 characters. Choose something you don&apos;t use anywhere else.
      </p>
      {state?.error && !state.fieldErrors && (
        <p className="text-sm text-rose-600" role="alert">{state.error}</p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? 'Updating…' : 'Update password'}
      </Button>
    </Form>
  )
}
