'use client'

import { useTransition } from 'react'
import { acknowledgePolicy } from '@/lib/modules/policies'
import { Button } from '@/lib/ui/Button'
import { toastError, toastSuccess } from '@/lib/ui/toast'

export function AcknowledgeButton({ policyId }: { policyId: string }) {
  const [pending, startTransition] = useTransition()

  function onClick() {
    const fd = new FormData()
    fd.set('policyId', policyId)
    startTransition(async () => {
      const r = await acknowledgePolicy(fd)
      if (r && 'error' in r && r.error) toastError(r.error)
      else toastSuccess('Policy acknowledged')
    })
  }

  return (
    <Button size="sm" disabled={pending} onClick={onClick}>
      {pending ? '…' : 'I acknowledge'}
    </Button>
  )
}
