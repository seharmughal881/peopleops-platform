'use client'

import { useState, useTransition } from 'react'
import { createPayslipRun } from '@/lib/modules/payroll/actions'
import { Button } from '@/lib/ui/Button'
import { Field, Input } from '@/lib/ui/Input'

export function NewRunForm() {
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  function onSubmit(formData: FormData) {
    setMessage(null)
    startTransition(async () => {
      const r = await createPayslipRun(formData)
      if (r?.ok) setMessage('Payslip run created.')
    })
  }

  return (
    <form action={onSubmit} className="space-y-3">
      <Field label="Period start"><Input type="date" name="periodStart" required /></Field>
      <Field label="Period end"><Input type="date" name="periodEnd" required /></Field>
      {message && <p className="text-sm text-emerald-600">{message}</p>}
      <Button type="submit" disabled={pending} className="w-full">{pending ? 'Creating…' : 'Create run'}</Button>
    </form>
  )
}
