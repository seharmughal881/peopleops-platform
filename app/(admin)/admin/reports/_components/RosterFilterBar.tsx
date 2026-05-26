'use client'

import { useEffect, useState, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { STATUS_OPTIONS, type StatusFilter } from './roster-status'

const inputCls =
  'rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-foreground placeholder:text-foreground-subtle outline-none focus:border-border-strong focus:ring-2 focus:ring-focus-ring/15'

export function RosterFilterBar({
  q,
  status,
  department,
  departments,
}: {
  q: string
  status: StatusFilter
  department: string
  departments: string[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()
  const [searchValue, setSearchValue] = useState(q)
  const [lastSyncedQ, setLastSyncedQ] = useState(q)
  if (q !== lastSyncedQ) {
    setLastSyncedQ(q)
    setSearchValue(q)
  }

  function setParam(name: string, value: string | null) {
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    if (value === null || value === '' || value === 'all') params.delete(name)
    else params.set(name, value)
    // Drill-down is row-level; reset when filters change
    if (name !== 'employeeId') params.delete('employeeId')
    const qs = params.toString()
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    })
  }

  useEffect(() => {
    if (searchValue === q) return
    const t = setTimeout(() => setParam('q', searchValue || null), 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue])

  function clearAll() {
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    params.delete('q')
    params.delete('status')
    params.delete('dept')
    params.delete('employeeId')
    const qs = params.toString()
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    })
  }

  const hasFilters = Boolean(q || (status && status !== 'all') || department)

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <input
          type="search"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder="Search name or code…"
          className={`${inputCls} w-64 pl-8`}
          aria-label="Search employee"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-foreground-subtle"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-4"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </span>
      </div>

      <select
        aria-label="Department"
        value={department}
        onChange={(e) => setParam('dept', e.target.value || null)}
        className={`${inputCls} pr-8`}
      >
        <option value="">All departments</option>
        {departments.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>

      <select
        aria-label="Status"
        value={status}
        onChange={(e) => setParam('status', e.target.value || null)}
        className={`${inputCls} pr-8`}
      >
        {STATUS_OPTIONS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>

      {hasFilters && (
        <button
          type="button"
          onClick={clearAll}
          className="text-xs text-foreground-muted hover:text-foreground"
        >
          Clear filters
        </button>
      )}

      {pending && <span className="text-xs text-foreground-subtle">Updating…</span>}
    </div>
  )
}
