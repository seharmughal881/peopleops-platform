'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useTransition } from 'react'

export function RosterDatePicker({
  current,
  min,
  max,
}: {
  current: string
  min?: string
  max?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [pending, startTransition] = useTransition()

  function go(date: string) {
    const next = new URLSearchParams(params)
    next.set('date', date)
    startTransition(() => {
      router.push(`${pathname}?${next.toString()}`)
    })
  }

  function shift(deltaDays: number) {
    const d = new Date(`${current}T00:00:00`)
    d.setDate(d.getDate() + deltaDays)
    go(toYmd(d))
  }

  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={() => shift(-1)}
        disabled={pending}
        aria-label="Previous day"
        className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-foreground-muted hover:bg-surface-muted hover:text-foreground disabled:opacity-50"
      >
        ←
      </button>
      <input
        type="date"
        value={current}
        min={min}
        max={max}
        disabled={pending}
        onChange={(e) => {
          if (e.target.value) go(e.target.value)
        }}
        className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-border-strong focus:ring-2 focus:ring-focus-ring/15 disabled:opacity-50"
      />
      <button
        type="button"
        onClick={() => shift(1)}
        disabled={pending}
        aria-label="Next day"
        className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-foreground-muted hover:bg-surface-muted hover:text-foreground disabled:opacity-50"
      >
        →
      </button>
      <button
        type="button"
        onClick={() => go(toYmd(new Date()))}
        disabled={pending}
        className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-foreground-muted hover:bg-surface-muted hover:text-foreground disabled:opacity-50"
      >
        Today
      </button>
    </div>
  )
}

function toYmd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
