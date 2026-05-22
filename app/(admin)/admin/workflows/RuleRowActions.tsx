'use client'

import { useTransition } from 'react'
import { toggleApprovalRule, deleteApprovalRule } from '@/lib/modules/workflows/rule-actions'
import { Button } from '@/lib/ui/Button'
import { toastError, toastSuccess } from '@/lib/ui/toast'

export function RuleRowActions({ id, active }: { id: string; active: boolean }) {
  const [pending, startTransition] = useTransition()

  function onToggle() {
    const fd = new FormData()
    fd.set('id', id)
    startTransition(async () => {
      const r = await toggleApprovalRule(fd)
      if (r && 'error' in r && r.error) toastError(r.error)
      else toastSuccess(active ? 'Rule disabled' : 'Rule enabled')
    })
  }

  function onDelete() {
    if (!confirm('Delete this rule?')) return
    const fd = new FormData()
    fd.set('id', id)
    startTransition(async () => {
      try {
        await deleteApprovalRule(fd)
        toastSuccess('Rule deleted')
      } catch (e) {
        toastError(e instanceof Error ? e : 'Failed to delete rule')
      }
    })
  }

  return (
    <div className="flex gap-1">
      <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={onToggle}>
        {active ? 'Disable' : 'Enable'}
      </Button>
      <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={onDelete}>
        Delete
      </Button>
    </div>
  )
}
