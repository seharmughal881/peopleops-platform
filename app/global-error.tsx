'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error('[global error]', error)
  }, [error])

  return (
    <html lang="en">
      <body className="m-0 min-h-screen bg-background font-sans text-foreground antialiased">
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 text-center shadow-xs">
            <h1 className="mb-2 text-lg font-semibold tracking-tight">Critical error</h1>
            <p className="mb-4 text-sm text-foreground-muted">
              The application encountered a problem and cannot continue rendering.
            </p>
            {error.digest && (
              <p className="mb-4 font-mono text-[10px] uppercase tracking-wide text-foreground-subtle">
                ref: {error.digest}
              </p>
            )}
            <button
              type="button"
              onClick={unstable_retry}
              className="inline-flex h-9 items-center justify-center rounded-md bg-foreground px-4 text-sm font-medium text-background"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
