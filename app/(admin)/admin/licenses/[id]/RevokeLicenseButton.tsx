'use client'

import { useTransition } from 'react'
import { revokeLicense } from '@/lib/modules/assets/actions'

export function RevokeLicenseButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition()
  function onClick() {
    if (!confirm('Revoke this seat?')) return
    const fd = new FormData()
    fd.set('assignmentId', id)
    startTransition(async () => { await revokeLicense(fd) })
  }
  return (
    <button onClick={onClick} disabled={pending} className="text-rose-600 hover:underline disabled:opacity-50">
      {pending ? '…' : 'Revoke'}
    </button>
  )
}
