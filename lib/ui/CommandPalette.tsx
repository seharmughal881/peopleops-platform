'use client'

import { Command } from 'cmdk'
import { useRouter } from 'next/navigation'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from 'react'
import { globalSearch, type SearchHit, type SearchResult } from '@/lib/modules/search'
import type { NavGroup } from './SidebarNav'

function isMac() {
  if (typeof navigator === 'undefined') return false
  return /mac/i.test(navigator.platform) || /mac/i.test(navigator.userAgent)
}

const EMPTY_RESULT: SearchResult = { people: [], departments: [], policies: [], leave: [] }
const DEBOUNCE_MS = 180

const RESULT_GROUPS: { key: keyof SearchResult; label: string; icon: ReactNode }[] = [
  { key: 'people', label: 'People', icon: <PeopleGlyph /> },
  { key: 'departments', label: 'Departments', icon: <BuildingGlyph /> },
  { key: 'policies', label: 'Policies', icon: <DocGlyph /> },
  { key: 'leave', label: 'Leave requests', icon: <CalendarGlyph /> },
]

export function CommandPalette({ groups }: { groups: NavGroup[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [mac, setMac] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult>(EMPTY_RESULT)
  const [isPending, startTransition] = useTransition()
  const requestSeqRef = useRef(0)

  useEffect(() => {
    setMac(isMac())
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isToggle = (e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)
      if (isToggle) {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Reset query when the dialog closes.
  useEffect(() => {
    if (!open) {
      setQuery('')
      setResults(EMPTY_RESULT)
    }
  }, [open])

  // Debounced server search. Each keystroke schedules a fetch; the seq guard
  // ensures stale responses don't overwrite a newer query's results.
  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setResults(EMPTY_RESULT)
      return
    }
    const seq = ++requestSeqRef.current
    const handle = setTimeout(() => {
      startTransition(async () => {
        try {
          const data = await globalSearch(trimmed)
          if (seq === requestSeqRef.current) setResults(data)
        } catch {
          if (seq === requestSeqRef.current) setResults(EMPTY_RESULT)
        }
      })
    }, DEBOUNCE_MS)
    return () => clearTimeout(handle)
  }, [query])

  const go = useCallback(
    (href: string) => {
      setOpen(false)
      router.push(href)
    },
    [router],
  )

  const navGroups = useMemo(() => groups.filter((g) => g.items.length > 0), [groups])
  const hasQuery = query.trim().length >= 2
  const totalResults = hasQuery
    ? RESULT_GROUPS.reduce((sum, g) => sum + results[g.key].length, 0)
    : 0
  const showingResults = hasQuery

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open command palette"
        className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-surface px-2.5 text-sm text-foreground-muted shadow-xs transition-colors hover:border-border-strong hover:text-foreground"
      >
        <SearchGlyph />
        <span className="hidden sm:inline">Search…</span>
        <kbd className="ml-2 hidden items-center gap-0.5 rounded border border-border bg-surface-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground-muted sm:inline-flex">
          {mac ? '⌘' : 'Ctrl'}K
        </kbd>
      </button>

      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        label="Command menu"
        shouldFilter={!showingResults}
        overlayClassName="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm"
        contentClassName="fixed left-1/2 top-[12vh] z-50 w-[90vw] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-surface shadow-[0_24px_60px_-20px_var(--accent-glow),0_8px_24px_-12px_rgb(0_0_0_/_0.2)]"
      >
        <div className="flex items-center gap-2 border-b border-border px-3.5">
          {isPending && hasQuery ? <Spinner /> : <SearchGlyph />}
          <Command.Input
            value={query}
            onValueChange={setQuery}
            placeholder="Search people, policies, departments…"
            className="h-12 w-full bg-transparent text-sm text-foreground placeholder:text-foreground-subtle outline-none"
          />
          <kbd className="hidden items-center gap-0.5 rounded border border-border bg-surface-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground-muted sm:inline-flex">
            esc
          </kbd>
        </div>
        <Command.List className="max-h-[60vh] overflow-y-auto px-2 py-2">
          {showingResults ? (
            <>
              {!isPending && totalResults === 0 && (
                <Command.Empty className="px-3 py-6 text-center text-sm text-foreground-muted">
                  No matches for “{query.trim()}”.
                </Command.Empty>
              )}
              {RESULT_GROUPS.map((g) => {
                const items = results[g.key]
                if (items.length === 0) return null
                return (
                  <Command.Group
                    key={g.key}
                    heading={g.label}
                    className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-foreground-subtle"
                  >
                    {items.map((item) => (
                      <ResultItem
                        key={`${g.key}-${item.id}`}
                        kind={g.key}
                        icon={g.icon}
                        hit={item}
                        onSelect={() => go(item.href)}
                      />
                    ))}
                  </Command.Group>
                )
              })}
            </>
          ) : (
            <>
              <Command.Empty className="px-3 py-6 text-center text-sm text-foreground-muted">
                No matches.
              </Command.Empty>
              {navGroups.map((group, gi) => (
                <Command.Group
                  key={gi}
                  heading={group.label}
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-foreground-subtle"
                >
                  {group.items.map((item) => (
                    <PaletteItem
                      key={item.href}
                      href={item.href}
                      label={item.label}
                      group={group.label}
                      icon={item.icon}
                      onSelect={() => go(item.href)}
                    />
                  ))}
                </Command.Group>
              ))}
            </>
          )}
        </Command.List>
        <div className="flex items-center justify-between gap-2 border-t border-border bg-surface-muted/70 px-3 py-2 text-[11px] text-foreground-muted">
          <span className="inline-flex items-center gap-1">
            <kbd className="rounded border border-border bg-surface px-1 py-0.5 font-mono">↑↓</kbd>
            navigate
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="rounded border border-border bg-surface px-1 py-0.5 font-mono">↵</kbd>
            open
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="rounded border border-border bg-surface px-1 py-0.5 font-mono">esc</kbd>
            close
          </span>
        </div>
      </Command.Dialog>
    </>
  )
}

function PaletteItem({
  href,
  label,
  group,
  icon,
  onSelect,
}: {
  href: string
  label: string
  group?: string
  icon?: ReactNode
  onSelect: () => void
}) {
  return (
    <Command.Item
      value={`${label} ${group ?? ''} ${href}`}
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-foreground-muted aria-selected:bg-accent-subtle aria-selected:text-foreground aria-selected:shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--accent)_30%,transparent)]"
    >
      {icon && (
        <span className="flex size-4 items-center justify-center text-foreground-subtle aria-selected:text-accent">
          {icon}
        </span>
      )}
      <span className="flex-1 truncate">{label}</span>
      <span className="hidden font-mono text-[11px] text-foreground-subtle sm:inline">{href}</span>
    </Command.Item>
  )
}

function ResultItem({
  kind,
  icon,
  hit,
  onSelect,
}: {
  kind: keyof SearchResult
  icon: ReactNode
  hit: SearchHit
  onSelect: () => void
}) {
  // shouldFilter is off in search mode, so cmdk renders every item we give it.
  // We still set a stable `value` so keyboard nav has something deterministic.
  return (
    <Command.Item
      value={`${kind}-${hit.id}`}
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-foreground-muted aria-selected:bg-accent-subtle aria-selected:text-foreground aria-selected:shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--accent)_30%,transparent)]"
    >
      <span className="flex size-4 items-center justify-center text-foreground-subtle aria-selected:text-accent">
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-foreground">{hit.label}</span>
        {hit.sublabel && (
          <span className="truncate text-[11px] text-foreground-subtle">{hit.sublabel}</span>
        )}
      </span>
    </Command.Item>
  )
}

function SearchGlyph() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-foreground-subtle"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

function Spinner() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className="animate-spin text-accent"
      aria-hidden
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}

function PeopleGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function BuildingGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01" />
    </svg>
  )
}

function DocGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M9 13h6M9 17h6" />
    </svg>
  )
}

function CalendarGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  )
}
