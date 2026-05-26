import Link from 'next/link'

export type PeriodKey = 'day' | 'week' | 'month'

const OPTIONS: Array<{ key: PeriodKey; label: string }> = [
  { key: 'day', label: 'Day' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
]

export function resolvePeriod(raw: string | undefined): PeriodKey {
  return raw === 'week' || raw === 'month' ? raw : 'day'
}

export function PeriodToggle({
  basePath,
  current,
  date,
}: {
  basePath: string
  current: PeriodKey
  date: string
}) {
  return (
    <nav
      className="inline-flex rounded-md border border-border bg-surface p-0.5 text-xs"
      aria-label="Period"
    >
      {OPTIONS.map((o) => {
        const active = o.key === current
        const q = new URLSearchParams({ period: o.key, date }).toString()
        return (
          <Link
            key={o.key}
            href={`${basePath}?${q}`}
            className={
              active
                ? 'rounded px-3 py-1.5 font-semibold bg-[var(--accent)] text-[var(--accent-foreground)]'
                : 'rounded px-3 py-1.5 text-foreground-muted hover:text-foreground'
            }
          >
            {o.label}
          </Link>
        )
      })}
    </nav>
  )
}
