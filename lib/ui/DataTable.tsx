import { type ReactNode } from 'react'
import Link from 'next/link'
import { Table, THead, TR, TH, TD } from './Table'
import { TableToolbar, type TableToolbarProps } from './TableToolbar'

export interface Column<T> {
  key: string
  header: ReactNode
  sortable?: boolean
  className?: string
  cell: (row: T) => ReactNode
}

export interface DataTableQuery {
  q?: string
  sort?: string
  order?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

const DEFAULT_PAGE_SIZE = 25

export function parseTableQuery(
  searchParams: Record<string, string | string[] | undefined>,
): Required<Pick<DataTableQuery, 'page' | 'pageSize'>> & DataTableQuery {
  const q = typeof searchParams.q === 'string' ? searchParams.q : undefined
  const sort = typeof searchParams.sort === 'string' ? searchParams.sort : undefined
  const orderRaw = typeof searchParams.order === 'string' ? searchParams.order : undefined
  const order = orderRaw === 'desc' ? 'desc' : orderRaw === 'asc' ? 'asc' : undefined
  const page = Math.max(
    1,
    Number(typeof searchParams.page === 'string' ? searchParams.page : 1) || 1,
  )
  const pageSize = Math.min(
    200,
    Math.max(
      1,
      Number(typeof searchParams.pageSize === 'string' ? searchParams.pageSize : DEFAULT_PAGE_SIZE) || DEFAULT_PAGE_SIZE,
    ),
  )
  return { q, sort, order, page, pageSize }
}

export function DataTable<T>({
  rows,
  columns,
  query,
  total,
  basePath,
  toolbar,
  emptyMessage = 'No results.',
  rowKey,
}: {
  rows: T[]
  columns: Column<T>[]
  query: Required<Pick<DataTableQuery, 'page' | 'pageSize'>> & DataTableQuery
  total: number
  basePath: string
  toolbar?: Omit<TableToolbarProps, 'basePath' | 'query' | 'total'>
  emptyMessage?: string
  rowKey: (row: T, index: number) => string
}) {
  return (
    <div className="space-y-3">
      <TableToolbar basePath={basePath} query={query} total={total} {...toolbar} />
      <Table>
        <THead>
          <TR>
            {columns.map((c) => (
              <TH key={c.key} className={c.className}>
                {c.sortable ? (
                  <SortLink basePath={basePath} columnKey={c.key} query={query}>
                    {c.header}
                  </SortLink>
                ) : (
                  c.header
                )}
              </TH>
            ))}
          </TR>
        </THead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-sm text-foreground-muted"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <TR key={rowKey(row, i)}>
                {columns.map((c) => (
                  <TD key={c.key} className={c.className}>
                    {c.cell(row)}
                  </TD>
                ))}
              </TR>
            ))
          )}
        </tbody>
      </Table>
      <Pagination basePath={basePath} query={query} total={total} />
    </div>
  )
}

function buildHref(
  basePath: string,
  query: DataTableQuery,
  patch: Record<string, string | number | undefined | null>,
): string {
  const params = new URLSearchParams()
  const merged: Record<string, string | number | undefined | null> = {
    q: query.q,
    sort: query.sort,
    order: query.order,
    page: query.page,
    pageSize: query.pageSize,
    ...patch,
  }
  for (const [k, v] of Object.entries(merged)) {
    if (v === undefined || v === null || v === '' || v === 0) continue
    params.set(k, String(v))
  }
  // Drop default page from URL for cleanliness
  if (params.get('page') === '1') params.delete('page')
  const qs = params.toString()
  return qs ? `${basePath}?${qs}` : basePath
}

function SortLink({
  basePath,
  columnKey,
  query,
  children,
}: {
  basePath: string
  columnKey: string
  query: DataTableQuery
  children: ReactNode
}) {
  const active = query.sort === columnKey
  const nextOrder = active && query.order === 'asc' ? 'desc' : 'asc'
  const href = buildHref(basePath, query, { sort: columnKey, order: nextOrder, page: 1 })
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
    >
      {children}
      <span className="text-foreground-subtle" aria-hidden="true">
        {active ? (query.order === 'asc' ? '↑' : '↓') : '↕'}
      </span>
    </Link>
  )
}

function Pagination({
  basePath,
  query,
  total,
}: {
  basePath: string
  query: Required<Pick<DataTableQuery, 'page' | 'pageSize'>> & DataTableQuery
  total: number
}) {
  const pageCount = Math.max(1, Math.ceil(total / query.pageSize))
  if (pageCount <= 1) return null
  const from = (query.page - 1) * query.pageSize + 1
  const to = Math.min(total, query.page * query.pageSize)
  const prev = Math.max(1, query.page - 1)
  const next = Math.min(pageCount, query.page + 1)
  return (
    <div className="flex items-center justify-between gap-2 text-xs text-foreground-muted">
      <p>
        Showing <span className="font-medium text-foreground">{from}</span>–
        <span className="font-medium text-foreground">{to}</span> of{' '}
        <span className="font-medium text-foreground">{total}</span>
      </p>
      <div className="inline-flex items-center gap-1">
        <PageLink
          basePath={basePath}
          query={query}
          page={prev}
          disabled={query.page === 1}
        >
          ← Prev
        </PageLink>
        <span className="px-2 text-foreground">
          Page {query.page} of {pageCount}
        </span>
        <PageLink
          basePath={basePath}
          query={query}
          page={next}
          disabled={query.page === pageCount}
        >
          Next →
        </PageLink>
      </div>
    </div>
  )
}

function PageLink({
  basePath,
  query,
  page,
  disabled,
  children,
}: {
  basePath: string
  query: DataTableQuery
  page: number
  disabled?: boolean
  children: ReactNode
}) {
  const cls =
    'rounded-md border border-border bg-surface px-2.5 py-1 text-xs transition-colors'
  if (disabled) {
    return <span className={`${cls} opacity-40`}>{children}</span>
  }
  return (
    <Link
      href={buildHref(basePath, query, { page })}
      className={`${cls} hover:bg-surface-muted`}
    >
      {children}
    </Link>
  )
}
