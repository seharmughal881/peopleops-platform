'use client'

import { useRef } from 'react'
import { createPolicy } from '@/lib/modules/policies'
import { Button } from '@/lib/ui/Button'
import { Field, Input, Select, Textarea } from '@/lib/ui/Input'
import { Form, fieldError, useActionForm, type ActionState } from '@/lib/ui/Form'

async function action(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const r = await createPolicy(formData)
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

export function NewPolicyForm() {
  const formRef = useRef<HTMLFormElement | null>(null)
  const { state, dispatch, pending } = useActionForm(action, {
    successMessage: 'Policy published',
    onSuccess: () => formRef.current?.reset(),
  })

  return (
    <Form ref={formRef} action={dispatch} pending={pending} className="space-y-3">
      <Field label="Title" required error={fieldError(state, 'title')}>
        <Input name="title" required maxLength={200} invalid={Boolean(fieldError(state, 'title'))} />
      </Field>
      <Field label="Category" required error={fieldError(state, 'category')}>
        <Select name="category" required defaultValue="general" invalid={Boolean(fieldError(state, 'category'))}>
          <option value="general">General</option>
          <option value="code_of_conduct">Code of conduct</option>
          <option value="security">Security</option>
          <option value="hr">HR</option>
          <option value="finance">Finance</option>
        </Select>
      </Field>
      <Field label="Body (markdown)" required error={fieldError(state, 'body')}>
        <Textarea
          name="body"
          required
          rows={10}
          maxLength={40000}
          placeholder="# Policy heading…"
          invalid={Boolean(fieldError(state, 'body'))}
        />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="requiresAck" defaultChecked /> Requires acknowledgement
      </label>
      {state?.error && !state.fieldErrors && (
        <p className="text-xs text-rose-600" role="alert">{state.error}</p>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? 'Publishing…' : 'Publish'}
      </Button>
    </Form>
  )
}
