import { type ReactNode } from 'react'

export function Card({
  children,
  className = '',
  padding = 'md',
}: {
  children: ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
}) {
  const pad = {
    none: '',
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-6',
  }[padding]
  return (
    <div
      className={`rounded-lg border border-border bg-surface ${pad} shadow-xs ${className}`}
    >
      {children}
    </div>
  )
}

export function CardHeader({
  title,
  subtitle,
  action,
  className = '',
}: {
  title: string
  subtitle?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={`mb-4 flex items-start justify-between gap-3 ${className}`}>
      <div className="min-w-0">
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-0.5 text-sm text-foreground-muted">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export function CardBody({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={className}>{children}</div>
}

export function CardFooter({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`mt-4 flex items-center justify-end gap-2 border-t border-border pt-4 ${className}`}
    >
      {children}
    </div>
  )
}

export function Stat({
  label,
  value,
  hint,
  trend,
}: {
  label: string
  value: string | number
  hint?: string
  trend?: { direction: 'up' | 'down' | 'flat'; label: string }
}) {
  const trendColor =
    trend?.direction === 'up'
      ? 'text-emerald-600'
      : trend?.direction === 'down'
      ? 'text-rose-600'
      : 'text-foreground-muted'
  const trendGlyph =
    trend?.direction === 'up' ? '↑' : trend?.direction === 'down' ? '↓' : '→'
  return (
    <Card className="card-accent-top">
      <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums text-foreground">
        {value}
      </p>
      <div className="mt-1.5 flex items-center gap-2 text-xs">
        {trend && (
          <span className={`inline-flex items-center gap-0.5 font-medium ${trendColor}`}>
            <span aria-hidden>{trendGlyph}</span>
            {trend.label}
          </span>
        )}
        {hint && <span className="text-foreground-subtle">{hint}</span>}
      </div>
    </Card>
  )
}
