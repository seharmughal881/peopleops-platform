'use client'

import { useTransition } from 'react'
import { advanceCandidate } from '@/lib/modules/recruitment/candidates'

const STAGES = ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected'] as const

export function StageButtons({ id, current }: { id: string; current: string }) {
  const [pending, startTransition] = useTransition()

  function go(stage: string) {
    if (stage === current) return
    const fd = new FormData()
    fd.set('id', id)
    fd.set('stage', stage)
    startTransition(async () => { await advanceCandidate(fd) })
  }

  return (
    <div className="flex flex-wrap gap-2">
      {STAGES.map((s) => (
        <button
          key={s}
          onClick={() => go(s)}
          disabled={pending || s === current}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
            s === current
              ? 'bg-accent text-accent-foreground'
              : 'bg-surface-muted text-foreground hover:bg-surface-hover'
          }`}
        >
          {s}
        </button>
      ))}
    </div>
  )
}
