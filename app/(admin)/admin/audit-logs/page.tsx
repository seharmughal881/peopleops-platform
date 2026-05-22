import {
  listAuditLogsPaged,
  listDistinctAuditActions,
  listDistinctAuditEntityTypes,
} from '@/lib/modules/audit'
import { listMySavedViews } from '@/lib/modules/saved-views'
import { Card, CardHeader } from '@/lib/ui/Card'
import { Badge } from '@/lib/ui/Table'
import { DataTable, parseTableQuery, type Column } from '@/lib/ui/DataTable'
import { SavedViews } from '@/lib/ui/SavedViews'
import { AuditDetailButton } from './AuditDetailButton'

type SortField = 'createdAt' | 'action' | 'entityType'
const SORT_FIELDS: ReadonlyArray<SortField> = ['createdAt', 'action', 'entityType']

function parseDate(input: string | string[] | undefined): Date | undefined {
  if (typeof input !== 'string' || input === '') return undefined
  // Accept either YYYY-MM-DD or full ISO. Native <input type=date> emits YYYY-MM-DD.
  const d = new Date(input.length === 10 ? `${input}T00:00:00.000Z` : input)
  return isNaN(d.getTime()) ? undefined : d
}

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const query = parseTableQuery(params)
  const entityType = typeof params.entityType === 'string' ? params.entityType : undefined
  const action = typeof params.action === 'string' ? params.action : undefined
  const from = parseDate(params.from)
  const rawTo = parseDate(params.to)
  // Make `to` inclusive of the whole selected day.
  const to = rawTo ? new Date(rawTo.getTime() + 24 * 60 * 60 * 1000 - 1) : undefined

  const sort = (SORT_FIELDS as readonly string[]).includes(query.sort ?? '')
    ? (query.sort as SortField)
    : undefined

  const [{ rows, total }, entityTypes, actions, savedViews] = await Promise.all([
    listAuditLogsPaged({
      q: query.q,
      entityType,
      action,
      from,
      to,
      sort,
      order: query.order,
      page: query.page,
      pageSize: query.pageSize,
    }),
    listDistinctAuditEntityTypes(),
    listDistinctAuditActions(),
    listMySavedViews('/admin/audit-logs'),
  ])

  type Row = (typeof rows)[number]

  const columns: Column<Row>[] = [
    {
      key: 'createdAt',
      header: 'When',
      sortable: true,
      cell: (l) => (
        <span className="whitespace-nowrap text-foreground-muted">
          {new Date(l.createdAt).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'actor',
      header: 'Actor',
      cell: (l) => (
        <span className="text-foreground">{l.user?.email ?? <em className="text-foreground-subtle">system</em>}</span>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      sortable: true,
      cell: (l) => <Badge tone="info">{l.action}</Badge>,
    },
    {
      key: 'entityType',
      header: 'Entity',
      sortable: true,
      cell: (l) =>
        l.entityType ? (
          <span className="whitespace-nowrap font-mono text-[12px] text-foreground">
            {l.entityType}
            {l.entityId ? <span className="text-foreground-subtle">:{l.entityId}</span> : null}
          </span>
        ) : (
          <span className="text-foreground-subtle">—</span>
        ),
    },
    {
      key: 'details',
      header: <span className="sr-only">Details</span>,
      cell: (l) => {
        const hasPayload = (l.before && l.before !== 'null') || (l.after && l.after !== 'null')
        if (!hasPayload && !l.ip && !l.userAgent) {
          return <span className="text-xs text-foreground-subtle">—</span>
        }
        return (
          <AuditDetailButton
            action={l.action}
            entity={
              l.entityType
                ? `${l.entityType}${l.entityId ? `:${l.entityId}` : ''}`
                : null
            }
            actor={l.user?.email ?? 'system'}
            when={new Date(l.createdAt).toLocaleString()}
            before={l.before ?? null}
            after={l.after ?? null}
            ip={l.ip}
            userAgent={l.userAgent}
          />
        )
      },
    },
  ]

  return (
    <Card>
      <CardHeader title="Audit logs" subtitle={`${total} events`} />
      <DataTable
        rows={rows}
        columns={columns}
        query={query}
        total={total}
        basePath="/admin/audit-logs"
        rowKey={(l) => l.id}
        emptyMessage="No audit events match your filters."
        toolbar={{
          searchPlaceholder: 'Search action, entity, actor email…',
          filters: [
            {
              name: 'entityType',
              label: 'Entity',
              options: entityTypes.map((t) => ({ label: t, value: t })),
            },
            {
              name: 'action',
              label: 'Action',
              options: actions.map((a) => ({ label: a, value: a })),
            },
          ],
          dateRange: { fromName: 'from', toName: 'to', label: 'Range' },
          rightSlot: <SavedViews views={savedViews} path="/admin/audit-logs" />,
        }}
      />
    </Card>
  )
}
