'use client'

import { useState, useTransition } from 'react'
import { markReimbursed } from '@/lib/modules/expenses/actions'

export function ReimburseButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function onClick() {
    if (!confirm('Mark this expense as reimbursed?')) return
    setError(null)
    const fd = new FormData()
    fd.set('id', id)
    startTransition(async () => {
      const r = await markReimbursed(fd)
      if (r?.error) setError(r.error)
    })
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button onClick={onClick} disabled={pending} className="text-emerald-600 hover:underline disabled:opacity-50">
        {pending ? '…' : 'Mark reimbursed'}
      </button>
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  )
}
