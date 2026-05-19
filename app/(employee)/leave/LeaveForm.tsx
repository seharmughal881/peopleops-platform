'use client'

import { useState, useTransition } from 'react'
import { submitLeaveRequest } from '@/lib/modules/leave/actions'
import { Button } from '@/lib/ui/Button'
import { Field, Input, Select, Textarea } from '@/lib/ui/Input'

export function LeaveForm() {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  function onSubmit(formData: FormData) {
    setError(null); setMessage(null)
    startTransition(async () => {
      const r = await submitLeaveRequest(formData)
      if (r?.error) setError(r.error)
      else setMessage('Request submitted. Awaiting approval.')
    })
  }

  return (
    <form action={onSubmit} className="space-y-3">
      <Field label="Type">
        <Select name="leaveType" defaultValue="vacation">
          <option value="vacation">Vacation</option>
          <option value="sick">Sick</option>
          <option value="personal">Personal</option>
          <option value="unpaid">Unpaid</option>
        </Select>
      </Field>
      <Field label="From"><Input type="date" name="startDate" required /></Field>
      <Field label="To"><Input type="date" name="endDate" required /></Field>
      <Field label="Reason"><Textarea name="reason" rows={2} /></Field>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      {message && <p className="text-sm text-emerald-600">{message}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? 'Submitting…' : 'Submit request'}
      </Button>
    </form>
  )
}
