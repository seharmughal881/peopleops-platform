'use client'

import { Command } from 'cmdk'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { NavGroup } from './SidebarNav'

function isMac() {
  if (typeof navigator === 'undefined') return false
  return /mac/i.test(navigator.platform) || /mac/i.test(navigator.userAgent)
}

export function CommandPalette({ groups }: { groups: NavGroup[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [mac, setMac] = useState(false)

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

  const go = useCallback(
    (href: string) => {
      setOpen(false)
      router.push(href)
    },
    [router],
  )

  const flatGroups = useMemo(() => groups.filter((g) => g.items.length > 0), [groups])

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
        overlayClassName="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm"
        contentClassName="fixed left-1/2 top-[12vh] z-50 w-[90vw] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-surface shadow-[0_24px_60px_-20px_var(--accent-glow),0_8px_24px_-12px_rgb(0_0_0_/_0.2)]"
      >
        <div className="flex items-center gap-2 border-b border-border px-3.5">
          <SearchGlyph />
          <Command.Input
            placeholder="Jump to…"
            className="h-12 w-full bg-transparent text-sm text-foreground placeholder:text-foreground-subtle outline-none"
          />
          <kbd className="hidden items-center gap-0.5 rounded border border-border bg-surface-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground-muted sm:inline-flex">
            esc
          </kbd>
        </div>
        <Command.List className="max-h-[60vh] overflow-y-auto px-2 py-2">
          <Command.Empty className="px-3 py-6 text-center text-sm text-foreground-muted">
            No matches.
          </Command.Empty>
          {flatGroups.map((group, gi) => (
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
