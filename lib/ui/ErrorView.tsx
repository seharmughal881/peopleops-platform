'use client'

import { Button } from './Button'

export function ErrorView({
  title = 'Something went wrong',
  description,
  digest,
  onRetry,
}: {
  title?: string
  description?: string
  digest?: string
  onRetry?: () => void
}) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 text-center shadow-xs">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-6"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h2 className="mb-1 text-base font-semibold text-foreground">{title}</h2>
        {description && (
          <p className="mb-4 text-sm text-foreground-muted">{description}</p>
        )}
        {digest && (
          <p className="mb-4 font-mono text-[10px] uppercase tracking-wide text-foreground-subtle">
            ref: {digest}
          </p>
        )}
        {onRetry && (
          <Button onClick={onRetry} variant="primary" size="sm">
            Try again
          </Button>
        )}
      </div>
    </div>
  )
}
