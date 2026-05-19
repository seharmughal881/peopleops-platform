import { type ReactNode } from 'react'
import { logoutAction } from '@/lib/modules/auth/actions'
import { Avatar } from './Avatar'
import { CommandPalette } from './CommandPalette'
import { FloatingDecor } from './FloatingDecor'
import { MobileSidebar } from './MobileSidebar'
import { SidebarNav, type NavGroup, type NavItem } from './SidebarNav'

export type { NavItem, NavGroup }

function toGroups(nav?: NavItem[], groups?: NavGroup[]): NavGroup[] {
  if (groups && groups.length) return groups
  if (nav && nav.length) return [{ items: nav }]
  return []
}

export function PortalShell({
  title,
  user,
  nav,
  groups,
  decorCount = 5,
  children,
}: {
  title: string
  user: { email: string; name?: string }
  nav?: NavItem[]
  groups?: NavGroup[]
  decorCount?: number
  children: ReactNode
}) {
  const resolved = toGroups(nav, groups)
  const displayName = user.name ?? user.email

  return (
    <div className="flex h-dvh bg-background">
      <aside className="bg-sidebar hidden w-64 shrink-0 flex-col border-r border-border md:flex">
        <div className="flex items-center gap-2.5 px-5 py-4">
          <span className="brand-mark flex size-7 items-center justify-center rounded-md text-[13px] font-semibold tracking-tight text-accent-foreground">
            {title.charAt(0)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight text-foreground">
              {title}
            </p>
          </div>
        </div>
        <div className="scroll-wide flex-1 overflow-y-auto px-3 py-2">
          <SidebarNav groups={resolved} />
        </div>
      </aside>

      <div className="relative flex min-w-0 flex-1 flex-col">
        <FloatingDecor count={decorCount} />
        <header className="relative z-10 flex h-14 items-center justify-between gap-3 border-b border-border bg-surface px-4 sm:px-6">
          <div className="flex items-center gap-2 md:hidden">
            <MobileSidebar title={title} groups={resolved} />
            <span className="text-sm font-semibold tracking-tight text-foreground">
              {title}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <CommandPalette groups={resolved} />
            <span className="hidden h-6 w-px bg-border sm:inline-block" aria-hidden />
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight text-foreground">
                {displayName}
              </p>
              {user.name && (
                <p className="text-xs leading-tight text-foreground-muted">
                  {user.email}
                </p>
              )}
            </div>
            <Avatar name={user.name} email={user.email} size="md" />
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-md px-2.5 py-1.5 text-sm text-foreground-muted transition-colors hover:bg-surface-muted hover:text-foreground"
              >
                Sign out
              </button>
            </form>
          </div>
        </header>
        <main className="relative z-10 flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  )
}
