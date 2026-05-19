'use client'

import { useTransition } from 'react'
import { toggleApprovalRule, deleteApprovalRule } from '@/lib/modules/workflows/rule-actions'
import { Button } from '@/lib/ui/Button'

export function RuleRowActions({ id, active }: { id: string; active: boolean }) {
  const [pending, startTransition] = useTransition()

  function onToggle() {
    const fd = new FormData(); fd.set('id', id)
    startTransition(() => { toggleApprovalRule(fd) })
  }

  function onDelete() {
    if (!confirm('Delete this rule?')) return
    const fd = new FormData(); fd.set('id', id)
    startTransition(() => { deleteApprovalRule(fd) })
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
