'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { SidebarNav, type NavGroup } from './SidebarNav'

export function MobileSidebar({
  title,
  groups,
}: {
  title: string
  groups: NavGroup[]
}) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  function handleNavClick(e: React.MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement
    if (target.closest('a')) setOpen(false)
  }

  const drawer = (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] md:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-foreground/30 backdrop-blur-sm"
            aria-hidden
          />
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            className="bg-sidebar absolute inset-y-0 left-0 flex w-72 max-w-[80vw] flex-col border-r border-border shadow-[0_10px_40px_-10px_var(--accent-glow)]"
          >
            <div className="flex items-center justify-between gap-2.5 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <span className="brand-mark flex size-7 items-center justify-center rounded-md text-[13px] font-semibold tracking-tight text-accent-foreground">
                  {title.charAt(0)}
                </span>
                <p className="truncate text-sm font-semibold tracking-tight text-foreground">
                  {title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
                className="inline-flex size-8 items-center justify-center rounded-md text-foreground-muted transition-colors hover:bg-surface-muted hover:text-foreground"
              >
                <CloseIcon />
              </button>
            </div>
            <div className="scroll-wide flex-1 overflow-y-auto px-3 py-2" onClick={handleNavClick}>
              <SidebarNav groups={groups} />
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  )

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
        aria-expanded={open}
        className="inline-flex size-9 items-center justify-center rounded-md text-foreground-muted transition-colors hover:bg-surface-muted hover:text-foreground md:hidden"
      >
        <MenuIcon />
      </button>
      {mounted && createPortal(drawer, document.body)}
    </>
  )
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="size-5" aria-hidden>
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="size-5" aria-hidden>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}
