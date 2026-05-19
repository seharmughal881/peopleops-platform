'use client'

import { useState, useTransition } from 'react'
import { returnAsset } from '@/lib/modules/assets/actions'
import { Button } from '@/lib/ui/Button'
import { Field, Select, Textarea } from '@/lib/ui/Input'

export function ReturnAssetForm({
  assignmentId,
  who,
  assignedAt,
}: {
  assignmentId: string
  who: string
  assignedAt: Date | string
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function onSubmit(formData: FormData) {
    setError(null)
    formData.set('assignmentId', assignmentId)
    startTransition(async () => {
      const r = await returnAsset(formData)
      if (r?.error) setError(r.error)
    })
  }

  return (
    <div className="space-y-3 text-sm">
      <p className="text-foreground-muted">
        Assigned to <span className="font-medium text-foreground">{who}</span> on{' '}
        {new Date(assignedAt).toLocaleDateString()}
      </p>
      <form action={onSubmit} className="space-y-3 rounded-md border border-border bg-surface-muted p-3">
        <Field label="Condition on return">
          <Select name="condition" defaultValue="good">
            <option value="good">Good</option>
            <option value="damaged">Damaged</option>
            <option value="missing">Missing</option>
          </Select>
        </Field>
        <Field label="Next status">
          <Select name="nextStatus" defaultValue="available">
            <option value="available">Available</option>
            <option value="maintenance">Maintenance</option>
            <option value="retired">Retired</option>
          </Select>
        </Field>
        <Field label="Notes"><Textarea name="notes" rows={2} /></Field>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <Button type="submit" disabled={pending} className="w-full">{pending ? 'Processing…' : 'Mark returned'}</Button>
      </form>
    </div>
  )
}
