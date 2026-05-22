'use client'

import { useEffect, useRef, useState } from 'react'
import { JsonDiff } from '@/lib/ui/JsonDiff'

interface AuditDetailButtonProps {
  action: string
  entity: string | null
  actor: string
  when: string
  before: string | null
  after: string | null
  ip?: string | null
  userAgent?: string | null
}

export function AuditDetailButton({
  action,
  entity,
  actor,
  when,
  before,
  after,
  ip,
  userAgent,
}: AuditDetailButtonProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState(false)

  // Close on Escape (native <dialog> handles this but we mirror state).
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    const onClose = () => setOpen(false)
    dialog.addEventListener('close', onClose)
    return () => dialog.removeEventListener('close', onClose)
  }, [])

  function openDialog() {
    setOpen(true)
    ref.current?.showModal()
  }

  function closeDialog() {
    ref.current?.close()
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-foreground-muted transition-colors hover:border-border-strong hover:text-foreground"
      >
        View
      </button>

      <dialog
        ref={ref}
        className="w-[min(90vw,920px)] rounded-xl border border-border bg-surface p-0 text-foreground shadow-[0_24px_60px_-20px_var(--accent-glow),0_8px_24px_-12px_rgb(0_0_0_/_0.2)] backdrop:bg-foreground/40 backdrop:backdrop-blur-sm"
        onClick={(e) => {
          // Click outside the inner content closes (native <dialog> backdrop click).
          if (e.target === ref.current) closeDialog()
        }}
      >
        {open && (
          <div className="max-h-[85vh] overflow-y-auto">
            <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-border bg-surface px-5 py-3.5">
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold tracking-tight text-foreground">
                  {action}
                </h2>
                <p className="mt-0.5 text-xs text-foreground-muted">
                  {entity ?? '—'} · {actor} · {when}
                </p>
              </div>
              <button
                type="button"
                onClick={closeDialog}
                aria-label="Close"
                className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-foreground-muted transition-colors hover:border-border-strong hover:text-foreground"
              >
                Close (Esc)
              </button>
            </header>
            <div className="space-y-4 px-5 py-4">
              <JsonDiff before={before} after={after} />
              {(ip || userAgent) && (
                <dl className="grid gap-x-4 gap-y-1 rounded-md border border-border bg-surface-muted/40 px-3 py-2 text-xs sm:grid-cols-[auto_1fr]">
                  {ip && (
                    <>
                      <dt className="text-foreground-subtle">IP</dt>
                      <dd className="font-mono text-foreground">{ip}</dd>
                    </>
                  )}
                  {userAgent && (
                    <>
                      <dt className="text-foreground-subtle">User agent</dt>
                      <dd className="break-all font-mono text-foreground">{userAgent}</dd>
                    </>
                  )}
                </dl>
              )}
            </div>
          </div>
        )}
      </dialog>
    </>
  )
}
