'use client'

import { useTransition } from 'react'
import { terminateEnrollment } from '@/lib/modules/benefits'

export function AdminTerminateButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition()
  function onClick() {
    const fd = new FormData()
    fd.set('id', id)
    startTransition(async () => {
      await terminateEnrollment(fd)
    })
  }
  return (
    <button onClick={onClick} disabled={pending} className="text-rose-600 hover:underline disabled:opacity-50 text-xs">
      {pending ? '…' : 'Terminate'}
    </button>
  )
}
