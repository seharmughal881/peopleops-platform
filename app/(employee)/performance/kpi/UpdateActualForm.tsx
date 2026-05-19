'use client'

import { useState, useTransition } from 'react'
import { updateKpiActual } from '@/lib/modules/performance/kpi'
import { Button } from '@/lib/ui/Button'
import { Input } from '@/lib/ui/Input'

export function UpdateActualForm({ id, current }: { id: string; current: number }) {
  const [pending, startTransition] = useTransition()
  const [value, setValue] = useState(String(current))
  const [error, setError] = useState<string | null>(null)

  function onSubmit(formData: FormData) {
    setError(null)
    formData.set('id', id)
    startTransition(async () => {
      const r = await updateKpiActual(formData)
      if (r?.error) setError(r.error)
    })
  }

  return (
    <form action={onSubmit} className="flex items-center gap-2">
      <Input
        type="number"
        step="any"
        name="actual"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-24"
      />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? '…' : 'Save'}
      </Button>
      {error && <span className="text-xs text-rose-600">{error}</span>}
    </form>
  )
}
