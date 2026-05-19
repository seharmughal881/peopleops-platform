'use client'

import { useRef, useState, useTransition } from 'react'
import { createLicense } from '@/lib/modules/assets/actions'
import { LICENSE_TYPES } from '@/lib/modules/assets/schemas'
import { Button } from '@/lib/ui/Button'
import { Field, Input, Select, Textarea } from '@/lib/ui/Input'

export function NewLicenseForm() {
  const formRef = useRef<HTMLFormElement | null>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  function onSubmit(formData: FormData) {
    setError(null); setMessage(null)
    startTransition(async () => {
      const r = await createLicense(formData)
      if (r?.error) setError(r.error)
      else {
        setMessage('Created.')
        formRef.current?.reset()
      }
    })
  }

  return (
    <form ref={formRef} action={onSubmit} className="space-y-3">
      <Field label="Name" required><Input name="name" required placeholder="Figma" /></Field>
      <Field label="Vendor"><Input name="vendor" placeholder="Figma Inc." /></Field>
      <Field label="Type">
        <Select name="licenseType" defaultValue="subscription">
          {LICENSE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </Select>
      </Field>
      <Field label="Seats" required><Input type="number" name="seats" min="1" defaultValue="5" required /></Field>
      <Field label="Cost"><Input type="number" name="cost" step="0.01" min="0" /></Field>
      <Field label="Renewal date"><Input type="date" name="renewalDate" /></Field>
      <Field label="Notes"><Textarea name="notes" rows={2} /></Field>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      {message && <p className="text-sm text-emerald-600">{message}</p>}
      <Button type="submit" disabled={pending} className="w-full">{pending ? 'Creating…' : 'Create license'}</Button>
    </form>
  )
}
