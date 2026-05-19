'use client'

import { useTransition } from 'react'
import { togglePolicyActive } from '@/lib/modules/policies'
import { Button } from '@/lib/ui/Button'

export function ToggleActiveButton({ id, active }: { id: string; active: boolean }) {
  const [pending, startTransition] = useTransition()
  function onClick() {
    const fd = new FormData(); fd.set('id', id)
    startTransition(() => { togglePolicyActive(fd) })
  }
  return (
    <Button type="button" size="sm" variant="outline" disabled={pending} onClick={onClick}>
      {pending ? '…' : active ? 'Archive policy' : 'Reactivate policy'}
    </Button>
  )
}
