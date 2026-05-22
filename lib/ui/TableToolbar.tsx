'use client'

import { useEffect, useState, useTransition, type ReactNode } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

export interface FilterOption {
  label: string
  value: string
}

export interface FilterDef {
  name: string
  label: string
  options: FilterOption[]
}

export interface DateRangeDef {
  fromName: string
  toName: string
  label?: string
}

export interface TableToolbarProps {
  basePath: string
  query: { q?: string; sort?: string; order?: 'asc' | 'desc'; page: number; pageSize: number }
  total: number
  searchPlaceholder?: string
  filters?: FilterDef[]
  dateRange?: DateRangeDef
  rightSlot?: ReactNode
}

const inputCls =
  'rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-foreground placeholder:text-foreground-subtle outline-none focus:border-border-strong focus:ring-2 focus:ring-focus-ring/15'

export function TableToolbar({
  basePath,
  query,
  searchPlaceholder = 'Search…',
  filters,
  dateRange,
  rightSlot,
}: TableToolbarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()
  const [searchValue, setSearchValue] = useState(query.q ?? '')

  useEffect(() => {
    setSearchValue(query.q ?? '')
  }, [query.q])

  function setParam(name: string, value: string | null) {
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    if (value === null || value === '') params.delete(name)
    else params.set(name, value)
    // Reset to first page whenever filters change
    if (name !== 'page') params.delete('page')
    const qs = params.toString()
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    })
  }

  // Debounced search
  useEffect(() => {
    if (searchValue === (query.q ?? '')) return
    const t = setTimeout(() => setParam('q', searchValue || null), 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue])

  function clearAll() {
    startTransition(() => router.replace(basePath, { scroll: false }))
  }

  const hasFilters = Boolean(
    query.q ||
      (filters && filters.some((f) => searchParams?.get(f.name))) ||
      (dateRange && (searchParams?.get(dateRange.fromName) || searchParams?.get(dateRange.toName))) ||
      query.sort,
  )

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <input
          type="search"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder={searchPlaceholder}
          className={`${inputCls} w-56 pl-8`}
          aria-label="Search"
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

      {filters?.map((f) => (
        <select
          key={f.name}
          aria-label={f.label}
          value={searchParams?.get(f.name) ?? ''}
          onChange={(e) => setParam(f.name, e.target.value || null)}
          className={`${inputCls} pr-8`}
        >
          <option value="">{f.label}: all</option>
          {f.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {f.label}: {opt.label}
            </option>
          ))}
        </select>
      ))}

      {dateRange && (
        <div className="inline-flex items-center gap-1 text-xs text-foreground-muted">
          <span className="hidden sm:inline">{dateRange.label ?? 'From'}</span>
          <input
            type="date"
            aria-label={`${dateRange.label ?? 'From'} (from)`}
            value={searchParams?.get(dateRange.fromName) ?? ''}
            onChange={(e) => setParam(dateRange.fromName, e.target.value || null)}
            className={inputCls}
          />
          <span aria-hidden="true">→</span>
          <input
            type="date"
            aria-label={`${dateRange.label ?? 'To'} (to)`}
            value={searchParams?.get(dateRange.toName) ?? ''}
            onChange={(e) => setParam(dateRange.toName, e.target.value || null)}
            className={inputCls}
          />
        </div>
      )}

      {hasFilters && (
        <button
          type="button"
          onClick={clearAll}
          className="text-xs text-foreground-muted hover:text-foreground"
        >
          Clear
        </button>
      )}

      <div className="ml-auto flex items-center gap-2">
        {pending && <span className="text-xs text-foreground-subtle">Updating…</span>}
        {rightSlot}
      </div>
    </div>
  )
}
