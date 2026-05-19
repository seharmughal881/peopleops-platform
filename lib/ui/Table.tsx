import { type ReactNode } from 'react'

export { Badge } from './Badge'

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  )
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b border-border bg-surface-muted text-xs font-medium uppercase tracking-wide text-foreground-muted">
      {children}
    </thead>
  )
}

export function TR({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <tr
      className={`border-b border-border last:border-0 transition-colors hover:bg-surface-muted/60 ${className}`}
    >
      {children}
    </tr>
  )
}

export function TH({
  children,
  className = '',
}: {
  children?: ReactNode
  className?: string
}) {
  return <th className={`px-4 py-2.5 font-medium ${className}`}>{children}</th>
}

export function TD({
  children,
  className = '',
}: {
  children?: ReactNode
  className?: string
}) {
  return <td className={`px-4 py-3 text-foreground ${className}`}>{children}</td>
}
