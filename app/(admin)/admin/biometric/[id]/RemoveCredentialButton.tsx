'use client'

import { useTransition } from 'react'
import { removeCredential } from '@/lib/modules/integrations/biometric-actions'
import { Button } from '@/lib/ui/Button'

export function RemoveCredentialButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition()
  function onClick() {
    if (!confirm('Remove this enrollment?')) return
    const fd = new FormData(); fd.set('id', id)
    startTransition(() => { removeCredential(fd) })
  }
  return (
    <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={onClick}>
      {pending ? 'Removing…' : 'Remove'}
    </Button>
  )
}
