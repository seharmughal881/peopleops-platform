'use client'

import { useTransition } from 'react'
import { acknowledgePolicy } from '@/lib/modules/policies'
import { Button } from '@/lib/ui/Button'

export function AcknowledgeButton({ policyId }: { policyId: string }) {
  const [pending, startTransition] = useTransition()
  function onClick() {
    const fd = new FormData(); fd.set('policyId', policyId)
    startTransition(() => { acknowledgePolicy(fd) })
  }
  return (
    <Button size="sm" disabled={pending} onClick={onClick}>
      {pending ? '…' : 'I acknowledge'}
    </Button>
  )
}
