'use client'

import { createPayslipRun } from '@/lib/modules/payroll/actions'
import { Button } from '@/lib/ui/Button'
import { Field, Input } from '@/lib/ui/Input'
import { Form, fieldError, useActionForm, type ActionState } from '@/lib/ui/Form'

async function action(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const r = await createPayslipRun(formData)
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

export function NewRunForm() {
  const { state, dispatch, pending } = useActionForm(action, {
    successMessage: 'Payslip run created',
  })

  return (
    <Form action={dispatch} pending={pending} className="space-y-3">
      <Field label="Period start" required error={fieldError(state, 'periodStart')}>
        <Input
          type="date"
          name="periodStart"
          required
          invalid={Boolean(fieldError(state, 'periodStart'))}
        />
      </Field>
      <Field label="Period end" required error={fieldError(state, 'periodEnd')}>
        <Input
          type="date"
          name="periodEnd"
          required
          invalid={Boolean(fieldError(state, 'periodEnd'))}
        />
      </Field>
      {state?.error && !state.fieldErrors && (
        <p className="text-sm text-rose-600" role="alert">{state.error}</p>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? 'Creating…' : 'Create run'}
      </Button>
    </Form>
  )
}
