import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-8 text-center shadow-xs">
        <p className="font-mono text-xs uppercase tracking-wide text-foreground-subtle">
          404
        </p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-foreground">
          Page not found
        </h1>
        <p className="mt-2 text-sm text-foreground-muted">
          The page you’re looking for doesn’t exist or has been moved.
        </p>
        <Link
          href="/dashboard"
          className="gradient-accent mt-6 inline-flex h-9 items-center justify-center rounded-md px-3.5 text-sm font-medium text-accent-foreground shadow-xs transition-shadow hover:shadow-[0_6px_20px_-10px_var(--accent-glow)]"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  )
}
