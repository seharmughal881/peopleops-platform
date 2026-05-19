'use client'

import { useRef, useState, useTransition } from 'react'
import { createPlan } from '@/lib/modules/benefits'
import { PLAN_TYPES } from '@/lib/modules/benefits'
import { Button } from '@/lib/ui/Button'
import { Field, Input, Textarea, Select } from '@/lib/ui/Input'

export function NewPlanForm() {
  const formRef = useRef<HTMLFormElement | null>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  function onSubmit(formData: FormData) {
    setError(null); setMessage(null)
    startTransition(async () => {
      const r = await createPlan(formData)
      if (r?.error) setError(r.error)
      else {
        setMessage('Plan created.')
        formRef.current?.reset()
      }
    })
  }

  return (
    <form ref={formRef} action={onSubmit} className="space-y-3">
      <Field label="Name" required><Input name="name" required maxLength={120} /></Field>
      <Field label="Type" required>
        <Select name="type" defaultValue="health" required>
          {PLAN_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </Select>
      </Field>
      <Field label="Description"><Textarea name="description" rows={2} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Monthly premium" required>
          <Input type="number" name="monthlyPremium" step="0.01" min="0" required />
        </Field>
        <Field label="Employer share">
          <Input type="number" name="employerShare" step="0.01" min="0" defaultValue="0" />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Enrollment opens"><Input type="date" name="enrollOpensAt" /></Field>
        <Field label="Enrollment closes"><Input type="date" name="enrollClosesAt" /></Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="coversDependents" defaultChecked />
        Covers dependents
      </label>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      {message && <p className="text-sm text-emerald-600">{message}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? 'Creating…' : 'Create plan'}
      </Button>
    </form>
  )
}
