'use client'

import { useTransition } from 'react'
import { withdrawHiringRequest } from '@/lib/modules/recruitment/hiring-requests'
import { Button } from '@/lib/ui/Button'

export function WithdrawButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition()
  function onClick() {
    if (!confirm('Withdraw this hiring request?')) return
    const fd = new FormData(); fd.set('id', id)
    startTransition(() => { withdrawHiringRequest(fd) })
  }
  return (
    <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={onClick}>
      {pending ? '…' : 'Withdraw'}
    </Button>
  )
}
