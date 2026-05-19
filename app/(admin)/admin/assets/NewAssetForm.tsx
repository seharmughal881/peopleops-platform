'use client'

import { useRef, useState, useTransition } from 'react'
import { createAsset } from '@/lib/modules/assets/actions'
import { ASSET_CATEGORIES } from '@/lib/modules/assets/schemas'
import { Button } from '@/lib/ui/Button'
import { Field, Input, Select, Textarea } from '@/lib/ui/Input'

export function NewAssetForm() {
  const formRef = useRef<HTMLFormElement | null>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  function onSubmit(formData: FormData) {
    setError(null); setMessage(null)
    startTransition(async () => {
      const r = await createAsset(formData)
      if (r?.error) setError(r.error)
      else {
        setMessage('Asset created.')
        formRef.current?.reset()
      }
    })
  }

  return (
    <form ref={formRef} action={onSubmit} className="space-y-3">
      <Field label="Tag" required hint="e.g. ASSET-001"><Input name="tag" required /></Field>
      <Field label="Category" required>
        <Select name="category" required defaultValue="laptop">
          {ASSET_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
      </Field>
      <Field label="Name" required><Input name="name" required placeholder="MacBook Pro 16 M3" /></Field>
      <Field label="Serial number"><Input name="serialNumber" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Purchase date"><Input type="date" name="purchaseDate" /></Field>
        <Field label="Warranty end"><Input type="date" name="warrantyEndDate" /></Field>
      </div>
      <Field label="Purchase cost"><Input type="number" name="purchaseCost" step="0.01" min="0" /></Field>
      <Field label="Notes"><Textarea name="notes" rows={2} /></Field>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      {message && <p className="text-sm text-emerald-600">{message}</p>}
      <Button type="submit" disabled={pending} className="w-full">{pending ? 'Creating…' : 'Create asset'}</Button>
    </form>
  )
}
