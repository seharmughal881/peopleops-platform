import { type HTMLAttributes } from 'react'

export function Skeleton({
  className = '',
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-md bg-surface-muted ${className}`}
      {...rest}
    />
  )
}

const TEXT_WIDTHS = ['w-11/12', 'w-9/12', 'w-10/12', 'w-7/12', 'w-8/12', 'w-6/12']

export function SkeletonText({
  lines = 3,
  className = '',
}: {
  lines?: number
  className?: string
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-3 ${TEXT_WIDTHS[i % TEXT_WIDTHS.length]}`} />
      ))}
    </div>
  )
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div
      className={`rounded-lg border border-border bg-surface p-5 ${className}`}
    >
      <Skeleton className="mb-3 h-4 w-1/3" />
      <Skeleton className="mb-2 h-3 w-2/3" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  )
}

const CELL_WIDTHS = ['w-3/4', 'w-1/2', 'w-2/3', 'w-1/3', 'w-4/5', 'w-3/5']

export function SkeletonTable({
  rows = 6,
  columns = 5,
}: {
  rows?: number
  columns?: number
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border bg-surface-muted">
          <tr>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="px-4 py-2.5">
                <Skeleton className="h-3 w-20" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r} className="border-b border-border last:border-0">
              {Array.from({ length: columns }).map((_, c) => (
                <td key={c} className="px-4 py-3">
                  <Skeleton
                    className={`h-3 ${CELL_WIDTHS[(r + c) % CELL_WIDTHS.length]}`}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function SkeletonPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-3 w-72" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <SkeletonTable rows={6} columns={5} />
    </div>
  )
}
