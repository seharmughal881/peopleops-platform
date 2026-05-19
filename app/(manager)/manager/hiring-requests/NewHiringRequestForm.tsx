'use client'

import { useRef, useState, useTransition } from 'react'
import { createHiringRequest } from '@/lib/modules/recruitment/hiring-requests'
import { Button } from '@/lib/ui/Button'
import { Field, Input, Select, Textarea } from '@/lib/ui/Input'

export function NewHiringRequestForm({ departments }: { departments: { id: string; name: string }[] }) {
  const formRef = useRef<HTMLFormElement | null>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  function onSubmit(formData: FormData) {
    setError(null); setMessage(null)
    startTransition(async () => {
      const r = await createHiringRequest(formData)
      if (r?.error) setError(r.error)
      else { setMessage('Submitted.'); formRef.current?.reset() }
    })
  }

  return (
    <form ref={formRef} action={onSubmit} className="space-y-3">
      <Field label="Job title" required><Input name="jobTitle" required maxLength={160} placeholder="Senior Engineer" /></Field>
      <Field label="Department">
        <Select name="departmentId" defaultValue="">
          <option value="">— Optional —</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Headcount" required><Input type="number" name="headcount" min={1} defaultValue={1} required /></Field>
        <Field label="Urgency">
          <Select name="urgency" defaultValue="normal">
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </Select>
        </Field>
      </div>
      <Field label="Justification" required><Textarea name="justification" required rows={4} maxLength={4000} placeholder="Why this hire is needed…" /></Field>
      <Field label="Proposed budget" hint="Annual, optional"><Input type="number" step="any" name="proposedBudget" placeholder="120000" /></Field>
      {error && <p className="text-xs text-rose-600">{error}</p>}
      {message && <p className="text-xs text-emerald-600">{message}</p>}
      <Button type="submit" disabled={pending} className="w-full">{pending ? 'Submitting…' : 'Submit request'}</Button>
    </form>
  )
}
