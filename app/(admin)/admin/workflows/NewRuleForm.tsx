'use client'

import { useRef, useState, useTransition } from 'react'
import { createApprovalRule } from '@/lib/modules/workflows/rule-actions'
import { Button } from '@/lib/ui/Button'
import { Field, Input, Select } from '@/lib/ui/Input'

export function NewRuleForm() {
  const formRef = useRef<HTMLFormElement | null>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  function onSubmit(formData: FormData) {
    setError(null); setMessage(null)
    startTransition(async () => {
      const r = await createApprovalRule(formData)
      if (r?.error) setError(r.error)
      else { setMessage('Rule created.'); formRef.current?.reset() }
    })
  }

  return (
    <form ref={formRef} action={onSubmit} className="space-y-3">
      <Field label="Name" required><Input name="name" required maxLength={160} placeholder="Leave > 5 days needs HR" /></Field>
      <Field label="Entity type" required>
        <Select name="entityType" required defaultValue="LeaveRequest">
          <option value="LeaveRequest">Leave request</option>
          <option value="Expense">Expense</option>
          <option value="HiringRequest">Hiring request</option>
        </Select>
      </Field>
      <Field label="Priority" hint="Lower = checked first"><Input type="number" name="priority" defaultValue={100} /></Field>

      <div className="rounded-md border border-border bg-surface-muted p-3 text-xs text-foreground-muted">
        Leave the condition blank to always match.<br />
        Fields available — LeaveRequest: <code>days</code>, <code>leaveType</code>; Expense: <code>amount</code>, <code>category</code>; HiringRequest: <code>urgency</code>.
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Field label="Field"><Input name="field" maxLength={40} placeholder="days" /></Field>
        <Field label="Op">
          <Select name="op" defaultValue="">
            <option value="">—</option>
            <option value="eq">=</option>
            <option value="gt">&gt;</option>
            <option value="gte">≥</option>
            <option value="lt">&lt;</option>
            <option value="lte">≤</option>
            <option value="in">in</option>
          </Select>
        </Field>
        <Field label="Value"><Input name="value" placeholder="5" /></Field>
      </div>

      <Field label="Approver chain" required hint="Comma-separated selectors: manager, hr_admin, finance, super_admin">
        <Input name="approverChain" required placeholder="manager, hr_admin" />
      </Field>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked /> Active
      </label>

      {error && <p className="text-xs text-rose-600">{error}</p>}
      {message && <p className="text-xs text-emerald-600">{message}</p>}
      <Button type="submit" disabled={pending} className="w-full">{pending ? 'Saving…' : 'Create rule'}</Button>
    </form>
  )
}
