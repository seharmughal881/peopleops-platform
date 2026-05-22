'use client'

import { useRef } from 'react'
import { createApprovalRule } from '@/lib/modules/workflows/rule-actions'
import { Button } from '@/lib/ui/Button'
import { Field, Input, Select } from '@/lib/ui/Input'
import { Form, fieldError, useActionForm, type ActionState } from '@/lib/ui/Form'

async function action(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const r = await createApprovalRule(formData)
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

export function NewRuleForm() {
  const formRef = useRef<HTMLFormElement | null>(null)
  const { state, dispatch, pending } = useActionForm(action, {
    successMessage: 'Rule created',
    onSuccess: () => formRef.current?.reset(),
  })

  return (
    <Form ref={formRef} action={dispatch} pending={pending} className="space-y-3">
      <Field label="Name" required error={fieldError(state, 'name')}>
        <Input
          name="name"
          required
          maxLength={160}
          placeholder="Leave > 5 days needs HR"
          invalid={Boolean(fieldError(state, 'name'))}
        />
      </Field>
      <Field label="Entity type" required error={fieldError(state, 'entityType')}>
        <Select
          name="entityType"
          required
          defaultValue="LeaveRequest"
          invalid={Boolean(fieldError(state, 'entityType'))}
        >
          <option value="LeaveRequest">Leave request</option>
          <option value="Expense">Expense</option>
          <option value="HiringRequest">Hiring request</option>
        </Select>
      </Field>
      <Field label="Priority" hint="Lower = checked first" error={fieldError(state, 'priority')}>
        <Input
          type="number"
          name="priority"
          defaultValue={100}
          invalid={Boolean(fieldError(state, 'priority'))}
        />
      </Field>

      <div className="rounded-md border border-border bg-surface-muted p-3 text-xs text-foreground-muted">
        Leave the condition blank to always match.<br />
        Fields available — LeaveRequest: <code>days</code>, <code>leaveType</code>; Expense: <code>amount</code>, <code>category</code>; HiringRequest: <code>urgency</code>.
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Field label="Field" error={fieldError(state, 'field')}>
          <Input name="field" maxLength={40} placeholder="days" invalid={Boolean(fieldError(state, 'field'))} />
        </Field>
        <Field label="Op" error={fieldError(state, 'op')}>
          <Select name="op" defaultValue="" invalid={Boolean(fieldError(state, 'op'))}>
            <option value="">—</option>
            <option value="eq">=</option>
            <option value="gt">&gt;</option>
            <option value="gte">≥</option>
            <option value="lt">&lt;</option>
            <option value="lte">≤</option>
            <option value="in">in</option>
          </Select>
        </Field>
        <Field label="Value" error={fieldError(state, 'value')}>
          <Input name="value" placeholder="5" invalid={Boolean(fieldError(state, 'value'))} />
        </Field>
      </div>

      <Field
        label="Approver chain"
        required
        hint="Comma-separated selectors: manager, hr_admin, finance, super_admin"
        error={fieldError(state, 'approverChain')}
      >
        <Input
          name="approverChain"
          required
          placeholder="manager, hr_admin"
          invalid={Boolean(fieldError(state, 'approverChain'))}
        />
      </Field>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked /> Active
      </label>

      {state?.error && !state.fieldErrors && (
        <p className="text-xs text-rose-600" role="alert">{state.error}</p>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? 'Saving…' : 'Create rule'}
      </Button>
    </Form>
  )
}
