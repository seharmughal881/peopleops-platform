import Link from 'next/link'

export type RangeKey = '30d' | '90d' | '1y' | 'ytd'

const OPTIONS: Array<{ key: RangeKey; label: string }> = [
  { key: '30d', label: 'Last 30d' },
  { key: '90d', label: 'Last 90d' },
  { key: '1y', label: 'Last 12mo' },
  { key: 'ytd', label: 'YTD' },
]

export function rangeFrom(key: RangeKey | undefined): { since: Date; key: RangeKey; label: string } {
  const k: RangeKey = key === '30d' || key === '90d' || key === '1y' || key === 'ytd' ? key : '90d'
  const now = new Date()
  let since: Date
  if (k === '30d') since = new Date(now.getTime() - 30 * 86400000)
  else if (k === '90d') since = new Date(now.getTime() - 90 * 86400000)
  else if (k === '1y') since = new Date(now.getTime() - 365 * 86400000)
  else since = new Date(now.getFullYear(), 0, 1)
  const label = OPTIONS.find((o) => o.key === k)?.label ?? k
  return { since, key: k, label }
}

export function RangeToggle({ basePath, current }: { basePath: string; current: RangeKey }) {
  return (
    <nav className="inline-flex rounded-md border border-border bg-surface p-0.5 text-xs" aria-label="Date range">
      {OPTIONS.map((o) => {
        const active = o.key === current
        return (
          <Link
            key={o.key}
            href={`${basePath}?range=${o.key}`}
            className={
              active
                ? 'rounded px-2.5 py-1 font-semibold bg-[var(--accent)] text-[var(--accent-foreground)]'
                : 'rounded px-2.5 py-1 text-foreground-muted hover:text-foreground'
            }
          >
            {o.label}
          </Link>
        )
      })}
    </nav>
  )
}
