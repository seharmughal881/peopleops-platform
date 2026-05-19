import { type ReactNode } from 'react'

type Tone = 'neutral' | 'success' | 'warn' | 'danger' | 'info'

const TONES: Record<Tone, string> = {
  neutral: 'bg-surface-muted text-foreground ring-border',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900',
  warn: 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900',
  danger: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900',
  info: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-900',
}

export function Badge({
  children,
  tone = 'neutral',
  dot = false,
}: {
  children: ReactNode
  tone?: Tone
  dot?: boolean
}) {
  const dotColor =
    tone === 'success'
      ? 'bg-emerald-500'
      : tone === 'warn'
      ? 'bg-amber-500'
      : tone === 'danger'
      ? 'bg-rose-500'
      : tone === 'info'
      ? 'bg-sky-500'
      : 'bg-foreground-subtle'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${TONES[tone]}`}
    >
      {dot && <span className={`size-1.5 rounded-full ${dotColor}`} aria-hidden />}
      {children}
    </span>
  )
}
