'use client'

import { useRef } from 'react'
import { createCycle } from '@/lib/modules/performance/reviews'
import { Button } from '@/lib/ui/Button'
import { Field, Input } from '@/lib/ui/Input'
import { Form, fieldError, useActionForm, type ActionState } from '@/lib/ui/Form'

async function action(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const r = await createCycle(formData)
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

export function NewCycleForm() {
  const formRef = useRef<HTMLFormElement | null>(null)
  const { state, dispatch, pending } = useActionForm(action, {
    successMessage: 'Review cycle created',
    onSuccess: () => formRef.current?.reset(),
  })

  return (
    <Form ref={formRef} action={dispatch} pending={pending} className="space-y-3">
      <Field label="Name" required error={fieldError(state, 'name')}>
        <Input
          name="name"
          required
          placeholder="2026 Q2 Review"
          invalid={Boolean(fieldError(state, 'name'))}
        />
      </Field>
      <Field label="Start date" required error={fieldError(state, 'startDate')}>
        <Input
          type="date"
          name="startDate"
          required
          invalid={Boolean(fieldError(state, 'startDate'))}
        />
      </Field>
      <Field label="End date" required error={fieldError(state, 'endDate')}>
        <Input
          type="date"
          name="endDate"
          required
          invalid={Boolean(fieldError(state, 'endDate'))}
        />
      </Field>
      {state?.error && !state.fieldErrors && (
        <p className="text-sm text-rose-600" role="alert">{state.error}</p>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? 'Creating…' : 'Create cycle'}
      </Button>
    </Form>
  )
}
