'use client'

import { updateMyProfile } from '@/lib/modules/employee/actions'
import { Button } from '@/lib/ui/Button'
import { Field, Input, Textarea } from '@/lib/ui/Input'
import { Form, fieldError, useActionForm, type ActionState } from '@/lib/ui/Form'

async function action(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const r = await updateMyProfile(formData)
  if (r && 'error' in r && r.error) {
    return {
      error: r.error,
      fieldErrors:
        'fieldErrors' in r
          ? (r.fieldErrors as Record<string, string[] | undefined> | undefined)
          : undefined,
    }
  }
  return { ok: true }
}

export function ProfileForm({
  defaults,
}: {
  defaults: { firstName: string; lastName: string; phone: string; personalEmail: string; address: string }
}) {
  const { state, dispatch, pending } = useActionForm(action, {
    successMessage: 'Profile updated',
  })

  return (
    <Form action={dispatch} pending={pending} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="First name" required error={fieldError(state, 'firstName')}>
          <Input
            name="firstName"
            defaultValue={defaults.firstName}
            required
            invalid={Boolean(fieldError(state, 'firstName'))}
          />
        </Field>
        <Field label="Last name" required error={fieldError(state, 'lastName')}>
          <Input
            name="lastName"
            defaultValue={defaults.lastName}
            required
            invalid={Boolean(fieldError(state, 'lastName'))}
          />
        </Field>
      </div>
      <Field label="Phone" error={fieldError(state, 'phone')}>
        <Input
          name="phone"
          defaultValue={defaults.phone}
          invalid={Boolean(fieldError(state, 'phone'))}
        />
      </Field>
      <Field label="Personal email" error={fieldError(state, 'personalEmail')}>
        <Input
          name="personalEmail"
          type="email"
          defaultValue={defaults.personalEmail}
          invalid={Boolean(fieldError(state, 'personalEmail'))}
        />
      </Field>
      <Field label="Address" error={fieldError(state, 'address')}>
        <Textarea
          name="address"
          rows={3}
          defaultValue={defaults.address}
          invalid={Boolean(fieldError(state, 'address'))}
        />
      </Field>
      {state?.error && !state.fieldErrors && (
        <p className="text-sm text-rose-600" role="alert">{state.error}</p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Save changes'}
      </Button>
    </Form>
  )
}
