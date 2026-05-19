'use client'

import { useTransition } from 'react'
import { setCycleStatus } from '@/lib/modules/performance/reviews'

export function CycleStatusButtons({ id, status }: { id: string; status: string }) {
  const [pending, startTransition] = useTransition()

  function transition(next: 'draft' | 'active' | 'closed') {
    const fd = new FormData()
    fd.set('id', id)
    fd.set('status', next)
    startTransition(async () => { await setCycleStatus(fd) })
  }

  return (
    <div className="flex gap-2 text-sm">
      {status === 'draft' && (
        <button onClick={() => transition('active')} disabled={pending} className="text-emerald-600 hover:underline">
          Activate
        </button>
      )}
      {status === 'active' && (
        <button onClick={() => transition('closed')} disabled={pending} className="text-foreground-muted hover:underline">
          Close
        </button>
      )}
    </div>
  )
}
