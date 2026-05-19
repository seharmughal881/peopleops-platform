'use client'

import { useTransition } from 'react'
import { closeKpi } from '@/lib/modules/performance/kpi'
import { Button } from '@/lib/ui/Button'

export function CloseKpiButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition()
  function onClick() {
    if (!confirm('Close this KPI? Status becomes "closed" and updates are blocked.')) return
    const fd = new FormData(); fd.set('id', id)
    startTransition(() => { closeKpi(fd) })
  }
  return (
    <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={onClick}>
      {pending ? '…' : 'Close'}
    </Button>
  )
}
