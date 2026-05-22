'use client'

import { useRef } from 'react'
import { createGoal } from '@/lib/modules/performance/goals'
import { Button } from '@/lib/ui/Button'
import { Field, Input, Select, Textarea } from '@/lib/ui/Input'
import { Form, fieldError, useActionForm, type ActionState } from '@/lib/ui/Form'

async function action(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const r = await createGoal(formData)
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

export function NewGoalForm({ employeeId }: { employeeId: string }) {
  const formRef = useRef<HTMLFormElement | null>(null)
  const { state, dispatch, pending } = useActionForm(action, {
    successMessage: 'Goal created',
    onSuccess: () => formRef.current?.reset(),
  })

  return (
    <Form ref={formRef} action={dispatch} pending={pending} className="space-y-3">
      <input type="hidden" name="employeeId" value={employeeId} />
      <Field label="Title" required error={fieldError(state, 'title')}>
        <Input name="title" required maxLength={200} invalid={Boolean(fieldError(state, 'title'))} />
      </Field>
      <Field label="Description" error={fieldError(state, 'description')}>
        <Textarea name="description" rows={3} invalid={Boolean(fieldError(state, 'description'))} />
      </Field>
      <Field label="Type" error={fieldError(state, 'type')}>
        <Select name="type" defaultValue="objective" invalid={Boolean(fieldError(state, 'type'))}>
          <option value="objective">Objective</option>
          <option value="keyResult">Key result</option>
          <option value="personal">Personal</option>
        </Select>
      </Field>
      <Field label="Target date" error={fieldError(state, 'targetDate')}>
        <Input type="date" name="targetDate" invalid={Boolean(fieldError(state, 'targetDate'))} />
      </Field>
      {state?.error && !state.fieldErrors && (
        <p className="text-sm text-rose-600" role="alert">{state.error}</p>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? 'Creating…' : 'Create goal'}
      </Button>
    </Form>
  )
}
