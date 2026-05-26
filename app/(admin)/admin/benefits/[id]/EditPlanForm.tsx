'use client'

import { useState, useTransition } from 'react'
import { updatePlan } from '@/lib/modules/benefits/actions'
import { PLAN_TYPES } from '@/lib/modules/benefits/schemas'
import { Button } from '@/lib/ui/Button'
import { Field, Input, Textarea, Select } from '@/lib/ui/Input'

export type PlanFormValues = {
  id: string
  name: string
  type: string
  description: string
  monthlyPremium: number
  employerShare: number
  coversDependents: boolean
  enrollOpensAt: string
  enrollClosesAt: string
}

export function EditPlanForm({ plan }: { plan: PlanFormValues }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  function onSubmit(formData: FormData) {
    setError(null); setMessage(null)
    startTransition(async () => {
      const r = await updatePlan(formData)
      if (r?.error) setError(r.error)
      else setMessage('Saved.')
    })
  }

  return (
    <form action={onSubmit} className="space-y-3">
      <input type="hidden" name="id" value={plan.id} />
      <Field label="Name" required>
        <Input name="name" defaultValue={plan.name} required maxLength={120} />
      </Field>
      <Field label="Type" required>
        <Select name="type" defaultValue={plan.type} required>
          {PLAN_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </Select>
      </Field>
      <Field label="Description">
        <Textarea name="description" rows={2} defaultValue={plan.description} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Monthly premium" required>
          <Input type="number" name="monthlyPremium" step="0.01" min="0" defaultValue={plan.monthlyPremium} required />
        </Field>
        <Field label="Employer share">
          <Input type="number" name="employerShare" step="0.01" min="0" defaultValue={plan.employerShare} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Enrollment opens"><Input type="date" name="enrollOpensAt" defaultValue={plan.enrollOpensAt} /></Field>
        <Field label="Enrollment closes"><Input type="date" name="enrollClosesAt" defaultValue={plan.enrollClosesAt} /></Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="coversDependents" defaultChecked={plan.coversDependents} />
        Covers dependents
      </label>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      {message && <p className="text-sm text-emerald-600">{message}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? 'Saving…' : 'Save'}
      </Button>
    </form>
  )
}
