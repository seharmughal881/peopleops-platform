'use client'

import { useRef, useState, useTransition } from 'react'
import { recommendPromotion } from '@/lib/modules/performance/promotions'
import { Button } from '@/lib/ui/Button'
import { Field, Input, Select, Textarea } from '@/lib/ui/Input'

interface Props {
  reports: { id: string; firstName: string; lastName: string; employeeCode: string }[]
  departments: { id: string; name: string }[]
}

export function RecommendPromotionForm({ reports, departments }: Props) {
  const formRef = useRef<HTMLFormElement | null>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  function onSubmit(formData: FormData) {
    setError(null); setMessage(null)
    startTransition(async () => {
      const r = await recommendPromotion(formData)
      if (r?.error) setError(r.error)
      else {
        setMessage('Sent to HR.')
        formRef.current?.reset()
      }
    })
  }

  return (
    <form ref={formRef} action={onSubmit} className="space-y-3">
      <Field label="Employee" required>
        <Select name="subjectId" required defaultValue="">
          <option value="" disabled>— Select —</option>
          {reports.map((r) => <option key={r.id} value={r.id}>{r.firstName} {r.lastName} ({r.employeeCode})</option>)}
        </Select>
      </Field>
      <Field label="Proposed title" required><Input name="proposedTitle" required placeholder="Senior Engineer" /></Field>
      <div className="grid grid-cols-[2fr_1fr] gap-3">
        <Field label="Proposed salary"><Input type="number" name="proposedSalary" step="0.01" min="0" /></Field>
        <Field label="Currency"><Input name="proposedCurrency" defaultValue="USD" maxLength={3} /></Field>
      </div>
      <Field label="Proposed department">
        <Select name="proposedDepartmentId" defaultValue="">
          <option value="">— Same as today —</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </Select>
      </Field>
      <Field label="Justification" required hint="Concrete impact, metrics, behaviors — HR uses this to decide.">
        <Textarea name="justification" rows={4} required minLength={10} maxLength={4000} />
      </Field>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      {message && <p className="text-sm text-emerald-600">{message}</p>}
      <Button type="submit" disabled={pending} className="w-full">{pending ? 'Submitting…' : 'Recommend'}</Button>
    </form>
  )
}
