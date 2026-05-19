'use client'

import { useRef, useState, useTransition } from 'react'
import { addSalaryEntry } from '@/lib/modules/employee/salary'
import { Button } from '@/lib/ui/Button'
import { Field, Input } from '@/lib/ui/Input'

export function AddSalaryForm({ employeeId }: { employeeId: string }) {
  const formRef = useRef<HTMLFormElement | null>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  function onSubmit(formData: FormData) {
    setError(null); setMessage(null)
    formData.set('employeeId', employeeId)
    startTransition(async () => {
      const r = await addSalaryEntry(formData)
      if (r?.error) setError(r.error)
      else {
        setMessage('Added.')
        formRef.current?.reset()
      }
    })
  }

  return (
    <form ref={formRef} action={onSubmit} className="space-y-3">
      <Field label="Amount"><Input type="number" name="amount" step="0.01" min="0" required /></Field>
      <Field label="Currency"><Input name="currency" defaultValue="USD" maxLength={3} /></Field>
      <Field label="Effective date"><Input type="date" name="effectiveDate" required /></Field>
      <Field label="Reason (optional)"><Input name="reason" placeholder="Promotion, annual raise…" /></Field>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      {message && <p className="text-sm text-emerald-600">{message}</p>}
      <Button type="submit" disabled={pending} className="w-full">{pending ? 'Adding…' : 'Add entry'}</Button>
    </form>
  )
}
