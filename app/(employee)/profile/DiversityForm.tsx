'use client'

import { useState, useTransition } from 'react'
import { updateMyDiversity, clearMyDiversity } from '@/lib/modules/diversity/actions'
import {
  GENDER_OPTIONS,
  ETHNICITY_OPTIONS,
  VETERAN_OPTIONS,
  DISABILITY_OPTIONS,
} from '@/lib/modules/diversity/schemas'
import { Button } from '@/lib/ui/Button'
import { Field, Input, Select } from '@/lib/ui/Input'

export type DiversityDefaults = {
  gender: string
  pronouns: string
  ethnicity: string
  veteranStatus: string
  disabilityStatus: string
}

export function DiversityForm({ defaults }: { defaults: DiversityDefaults }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  function onSubmit(formData: FormData) {
    setError(null); setMessage(null)
    startTransition(async () => {
      const r = await updateMyDiversity(formData)
      if (r?.error) setError(r.error)
      else setMessage('Saved.')
    })
  }

  function onClear() {
    if (!confirm('Remove all diversity information from your profile?')) return
    setError(null); setMessage(null)
    startTransition(async () => {
      const r = await clearMyDiversity()
      if (r?.error) setError(r.error)
      else setMessage('Cleared.')
    })
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <p className="text-xs text-foreground-muted">
        These fields are <strong>voluntary and confidential</strong>. They are visible only to you and aggregated for reporting; individual responses are never shown. Leave any field blank to skip.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Gender">
          <Select name="gender" defaultValue={defaults.gender}>
            <option value="">— Select —</option>
            {GENDER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </Field>
        <Field label="Pronouns" hint="e.g. she/her, they/them">
          <Input name="pronouns" defaultValue={defaults.pronouns} maxLength={40} />
        </Field>
        <Field label="Race / ethnicity">
          <Select name="ethnicity" defaultValue={defaults.ethnicity}>
            <option value="">— Select —</option>
            {ETHNICITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </Field>
        <Field label="Veteran status">
          <Select name="veteranStatus" defaultValue={defaults.veteranStatus}>
            <option value="">— Select —</option>
            {VETERAN_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </Field>
        <Field label="Disability status">
          <Select name="disabilityStatus" defaultValue={defaults.disabilityStatus}>
            <option value="">— Select —</option>
            {DISABILITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </Field>
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      {message && <p className="text-sm text-emerald-600">{message}</p>}
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save'}</Button>
        <button type="button" onClick={onClear} disabled={pending} className="text-sm text-rose-600 hover:underline disabled:opacity-50">
          Clear all
        </button>
      </div>
    </form>
  )
}
