'use client'

import { submitLeaveRequest } from '@/lib/modules/leave/actions'
import { Button } from '@/lib/ui/Button'
import { Field, Input, Select, Textarea } from '@/lib/ui/Input'
import {
  Form,
  fieldError,
  useActionForm,
  type ActionState,
} from '@/lib/ui/Form'

async function action(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const r = await submitLeaveRequest(formData)
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

export function LeaveForm() {
  const { state, dispatch, pending } = useActionForm(action, {
    successMessage: 'Leave request submitted',
  })

  return (
    <Form action={dispatch} pending={pending} className="space-y-3">
      <Field label="Type" error={fieldError(state, 'leaveType')}>
        <Select name="leaveType" defaultValue="vacation" invalid={Boolean(fieldError(state, 'leaveType'))}>
          <option value="vacation">Vacation</option>
          <option value="sick">Sick</option>
          <option value="personal">Personal</option>
          <option value="unpaid">Unpaid</option>
        </Select>
      </Field>
      <Field label="From" required error={fieldError(state, 'startDate')}>
        <Input type="date" name="startDate" required invalid={Boolean(fieldError(state, 'startDate'))} />
      </Field>
      <Field label="To" required error={fieldError(state, 'endDate')}>
        <Input type="date" name="endDate" required invalid={Boolean(fieldError(state, 'endDate'))} />
      </Field>
      <Field label="Reason" error={fieldError(state, 'reason')}>
        <Textarea name="reason" rows={2} invalid={Boolean(fieldError(state, 'reason'))} />
      </Field>
      {state?.error && !state.fieldErrors && (
        <p className="text-sm text-rose-600" role="alert">{state.error}</p>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? 'Submitting…' : 'Submit request'}
      </Button>
    </Form>
  )
}
