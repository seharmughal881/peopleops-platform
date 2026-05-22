'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  createSavedView,
  deleteSavedView,
  togglePinSavedView,
  type SavedViewDTO,
} from '@/lib/modules/saved-views'

interface SavedViewsProps {
  views: SavedViewDTO[]
  path: string
}

export function SavedViews({ views: initial, path }: SavedViewsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [views, setViews] = useState(initial)
  const [open, setOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setViews(initial)
  }, [initial])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) {
        setOpen(false)
        setRenaming(false)
        setError(null)
      }
    }
    if (open) document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  const currentQuery = searchParams?.toString() ?? ''
  const activeView = views.find((v) => v.query === currentQuery)
  const hasFilters = currentQuery.length > 0

  function applyView(view: SavedViewDTO) {
    setOpen(false)
    const href = view.query ? `${view.path}?${view.query}` : view.path
    router.replace(href, { scroll: false })
  }

  function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const trimmed = name.trim()
    if (!trimmed) return
    startTransition(async () => {
      const result = await createSavedView({
        name: trimmed,
        path,
        query: currentQuery,
      })
      if ('error' in result && result.error) {
        setError(result.error)
        return
      }
      setName('')
      setRenaming(false)
      // Optimistically prepend. Server-side revalidation will refresh authoritative copy.
      setViews((prev) => [
        ...prev,
        {
          id: result.ok && 'id' in result ? (result as { id: string }).id : crypto.randomUUID(),
          name: trimmed,
          path,
          query: currentQuery,
          pinned: false,
        },
      ])
    })
  }

  function onDelete(id: string) {
    startTransition(async () => {
      await deleteSavedView(id)
      setViews((prev) => prev.filter((v) => v.id !== id))
    })
  }

  function onTogglePin(id: string) {
    startTransition(async () => {
      const result = await togglePinSavedView(id)
      if ('pinned' in result && typeof result.pinned === 'boolean') {
        setViews((prev) =>
          prev
            .map((v) => (v.id === id ? { ...v, pinned: result.pinned as boolean } : v))
            .sort((a, b) => Number(b.pinned) - Number(a.pinned) || a.name.localeCompare(b.name)),
        )
      }
    })
  }

  function clearFilters() {
    setOpen(false)
    router.replace(pathname, { scroll: false })
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-xs text-foreground-muted transition-colors hover:border-border-strong hover:text-foreground"
      >
        <BookmarkGlyph filled={Boolean(activeView)} />
        <span className="font-medium text-foreground">
          {activeView ? activeView.name : 'Views'}
        </span>
        <ChevronGlyph />
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-1 w-72 overflow-hidden rounded-md border border-border bg-surface shadow-lg">
          {views.length === 0 ? (
            <p className="px-3 py-3 text-xs text-foreground-muted">No saved views yet.</p>
          ) : (
            <ul className="max-h-64 overflow-y-auto py-1">
              {views.map((v) => {
                const active = v.id === activeView?.id
                return (
                  <li
                    key={v.id}
                    className={`group flex items-center gap-1 px-2 py-1.5 text-sm ${active ? 'bg-accent-subtle' : 'hover:bg-surface-muted'}`}
                  >
                    <button
                      type="button"
                      onClick={() => applyView(v)}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    >
                      <BookmarkGlyph filled={v.pinned} small />
                      <span className="truncate text-foreground">{v.name}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onTogglePin(v.id)}
                      aria-label={v.pinned ? 'Unpin' : 'Pin'}
                      title={v.pinned ? 'Unpin' : 'Pin'}
                      className="rounded p-1 text-foreground-subtle opacity-0 transition-opacity hover:bg-surface hover:text-foreground group-hover:opacity-100"
                    >
                      <PinGlyph filled={v.pinned} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(v.id)}
                      aria-label="Delete"
                      title="Delete"
                      className="rounded p-1 text-foreground-subtle opacity-0 transition-opacity hover:bg-surface hover:text-rose-600 group-hover:opacity-100"
                    >
                      <TrashGlyph />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          <div className="border-t border-border p-2">
            {renaming ? (
              <form onSubmit={onSave} className="space-y-1.5">
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="View name"
                  className="w-full rounded-md border border-border bg-surface px-2 py-1 text-sm outline-none focus:border-border-strong focus:ring-2 focus:ring-focus-ring/15"
                />
                {error && <p className="text-[11px] text-rose-600">{error}</p>}
                <div className="flex items-center gap-1">
                  <button
                    type="submit"
                    disabled={isPending || !name.trim()}
                    className="rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground disabled:opacity-50"
                  >
                    {isPending ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRenaming(false)
                      setError(null)
                    }}
                    className="text-xs text-foreground-muted hover:text-foreground"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-1">
                <button
                  type="button"
                  disabled={!hasFilters || isPending}
                  onClick={() => {
                    setRenaming(true)
                    setName('')
                  }}
                  className="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-xs text-foreground-muted transition-colors hover:bg-surface-muted hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <PlusGlyph />
                  {hasFilters ? 'Save current view…' : 'Apply filters to save a view'}
                </button>
                {hasFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-xs text-foreground-muted transition-colors hover:bg-surface-muted hover:text-foreground"
                  >
                    <ClearGlyph />
                    Clear filters
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function BookmarkGlyph({ filled, small }: { filled?: boolean; small?: boolean }) {
  const size = small ? 12 : 14
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
    </svg>
  )
}

function ChevronGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function PinGlyph({ filled }: { filled?: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="12" y1="17" x2="12" y2="22" />
      <path d="M5 17h14l-1.5-3a2 2 0 0 1-.5-1.5V5a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v7.5a2 2 0 0 1-.5 1.5L5 17z" />
    </svg>
  )
}

function TrashGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  )
}

function PlusGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function ClearGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}
