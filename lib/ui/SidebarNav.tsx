'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { type ReactNode } from 'react'

export interface NavItem {
  label: string
  href: string
  icon?: ReactNode
}

export interface NavGroup {
  label?: string
  items: NavItem[]
}

function matches(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(href + '/')
}

function pickActiveHref(pathname: string | null, groups: NavGroup[]): string | null {
  if (!pathname) return null
  let best: string | null = null
  for (const g of groups) {
    for (const item of g.items) {
      if (matches(pathname, item.href) && (!best || item.href.length > best.length)) {
        best = item.href
      }
    }
  }
  return best
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={`group flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-all ${
        active
          ? 'gradient-accent-subtle font-medium text-foreground shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--accent)_30%,transparent),0_4px_14px_-8px_var(--accent-glow)]'
          : 'text-foreground-muted hover:bg-surface-muted hover:text-foreground'
      }`}
    >
      {item.icon && (
        <span
          className={`flex size-4 items-center justify-center transition-colors ${
            active ? 'text-accent-deep' : 'text-foreground-subtle group-hover:text-foreground-muted'
          }`}
          aria-hidden
        >
          {item.icon}
        </span>
      )}
      <span className="truncate">{item.label}</span>
    </Link>
  )
}

export function SidebarNav({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname()
  const activeHref = pickActiveHref(pathname, groups)
  return (
    <nav className="flex flex-col gap-5">
      {groups.map((group, gi) => (
        <div key={gi} className="flex flex-col gap-0.5">
          {group.label && (
            <p className="mb-1 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-foreground-subtle">
              {group.label}
            </p>
          )}
          {group.items.map((item) => (
            <NavLink key={item.href} item={item} active={item.href === activeHref} />
          ))}
        </div>
      ))}
    </nav>
  )
}
