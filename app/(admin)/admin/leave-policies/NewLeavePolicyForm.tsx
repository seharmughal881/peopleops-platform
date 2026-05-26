'use client'

import { useRef, useState, useTransition } from 'react'
import { createLeavePolicy } from '@/lib/modules/leave-policies'
import { Button } from '@/lib/ui/Button'
import { Field, Input, Select } from '@/lib/ui/Input'

export function NewLeavePolicyForm() {
  const formRef = useRef<HTMLFormElement | null>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  function onSubmit(formData: FormData) {
    setError(null)
    setMessage(null)
    startTransition(async () => {
      const r = await createLeavePolicy(formData)
      if (r?.error) setError(r.error)
      else {
        setMessage('Policy created.')
        formRef.current?.reset()
      }
    })
  }

  return (
    <form ref={formRef} action={onSubmit} className="space-y-3">
      <Field label="Name" required>
        <Input name="name" placeholder="e.g. Annual Vacation" required />
      </Field>
      <Field label="Leave type" required>
        <Select name="leaveType" defaultValue="vacation" required>
          <option value="vacation">Vacation</option>
          <option value="sick">Sick</option>
          <option value="personal">Personal</option>
          <option value="unpaid">Unpaid</option>
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Annual days" required>
          <Input type="number" name="annualEntitlement" min={0} max={365} step="0.5" defaultValue={0} required />
        </Field>
        <Field label="Carry-forward max">
          <Input type="number" name="carryForwardMax" min={0} max={365} step="0.5" defaultValue={0} />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked className="h-4 w-4" />
        <span>Active</span>
      </label>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      {message && <p className="text-sm text-emerald-600">{message}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? 'Creating…' : 'Create policy'}
      </Button>
    </form>
  )
}
