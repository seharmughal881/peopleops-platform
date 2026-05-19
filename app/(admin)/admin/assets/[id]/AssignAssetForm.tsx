'use client'

import { useState, useTransition } from 'react'
import { assignAsset } from '@/lib/modules/assets/actions'
import { Button } from '@/lib/ui/Button'
import { Field, Select, Textarea } from '@/lib/ui/Input'

interface Props {
  assetId: string
  employees: { id: string; firstName: string; lastName: string; employeeCode: string }[]
}

export function AssignAssetForm({ assetId, employees }: Props) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function onSubmit(formData: FormData) {
    setError(null)
    formData.set('assetId', assetId)
    startTransition(async () => {
      const r = await assignAsset(formData)
      if (r?.error) setError(r.error)
    })
  }

  return (
    <form action={onSubmit} className="space-y-3">
      <Field label="Employee" required>
        <Select name="employeeId" required defaultValue="">
          <option value="" disabled>— Select —</option>
          {employees.map((e) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.employeeCode})</option>)}
        </Select>
      </Field>
      <Field label="Notes"><Textarea name="notes" rows={2} /></Field>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <Button type="submit" disabled={pending} className="w-full">{pending ? 'Assigning…' : 'Assign'}</Button>
    </form>
  )
}
