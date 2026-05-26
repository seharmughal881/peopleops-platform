'use client'

import { useTransition } from 'react'
import { togglePlanActive } from '@/lib/modules/benefits/actions'
import { Button } from '@/lib/ui/Button'

export function ArchivePlanButton({ id, active }: { id: string; active: boolean }) {
  const [pending, startTransition] = useTransition()
  function onClick() {
    const fd = new FormData()
    fd.set('id', id)
    startTransition(async () => {
      await togglePlanActive(fd)
    })
  }
  return (
    <Button variant={active ? 'outline' : 'primary'} size="sm" disabled={pending} onClick={onClick}>
      {pending ? '…' : active ? 'Archive' : 'Reactivate'}
    </Button>
  )
}
