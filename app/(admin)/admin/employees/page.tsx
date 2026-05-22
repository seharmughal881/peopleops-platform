import Link from 'next/link'
import { prisma } from '@/lib/db/client'
import { listEmployeesPaged } from '@/lib/modules/employee/queries'
import { Card, CardHeader } from '@/lib/ui/Card'
import { Badge } from '@/lib/ui/Table'
import { DataTable, parseTableQuery, type Column } from '@/lib/ui/DataTable'

type SortField = 'name' | 'employeeCode' | 'email' | 'jobTitle' | 'department' | 'status'
const SORT_FIELDS: ReadonlyArray<SortField> = ['name', 'employeeCode', 'email', 'jobTitle', 'department', 'status']
const STATUSES = ['active', 'onLeave', 'terminated']

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const query = parseTableQuery(params)

  const departmentId = typeof params.departmentId === 'string' ? params.departmentId : undefined
  const status = typeof params.status === 'string' ? params.status : undefined
  const sort = (SORT_FIELDS as readonly string[]).includes(query.sort ?? '')
    ? (query.sort as SortField)
    : undefined

  const [{ rows, total }, departments] = await Promise.all([
    listEmployeesPaged({
      q: query.q,
      departmentId,
      status,
      sort,
      order: query.order,
      page: query.page,
      pageSize: query.pageSize,
    }),
    prisma.department.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ])

  type Row = (typeof rows)[number]

  const columns: Column<Row>[] = [
    {
      key: 'employeeCode',
      header: 'Code',
      sortable: true,
      cell: (e) => e.employeeCode,
    },
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      cell: (e) => (
        <Link
          href={`/admin/employees/${e.id}`}
          className="font-medium text-accent-deep hover:underline"
        >
          {e.firstName} {e.lastName}
        </Link>
      ),
    },
    { key: 'email', header: 'Email', sortable: true, cell: (e) => e.user.email },
    { key: 'jobTitle', header: 'Title', sortable: true, cell: (e) => e.jobTitle ?? '—' },
    { key: 'department', header: 'Department', sortable: true, cell: (e) => e.department?.name ?? '—' },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      cell: (e) => (
        <Badge tone={e.status === 'active' ? 'success' : 'neutral'}>{e.status}</Badge>
      ),
    },
  ]

  return (
    <Card>
      <CardHeader
        title="Employee directory"
        subtitle={`${total} total`}
        action={
          <div className="flex items-center gap-2">
            <Link
              href={`/admin/employees/export.csv?${buildExportQuery(params)}`}
              className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-surface px-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted"
            >
              Export CSV
            </Link>
            <Link
              href={`/admin/employees/export.xlsx?${buildExportQuery(params)}`}
              className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-surface px-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted"
            >
              Export Excel
            </Link>
            <Link
              href="/admin/employees/new"
              className="gradient-accent inline-flex h-9 items-center justify-center rounded-md px-3.5 text-sm font-medium text-accent-foreground shadow-xs transition-shadow hover:shadow-[0_6px_20px_-10px_var(--accent-glow)]"
            >
              Add employee
            </Link>
          </div>
        }
      />
      <DataTable
        rows={rows}
        columns={columns}
        query={query}
        total={total}
        basePath="/admin/employees"
        rowKey={(e) => e.id}
        emptyMessage="No employees match your filters."
        toolbar={{
          searchPlaceholder: 'Search by name, code, email, title…',
          filters: [
            {
              name: 'departmentId',
              label: 'Dept',
              options: departments.map((d) => ({ label: d.name, value: d.id })),
            },
            {
              name: 'status',
              label: 'Status',
              options: STATUSES.map((s) => ({ label: s, value: s })),
            },
          ],
        }}
      />
    </Card>
  )
}

function buildExportQuery(params: Record<string, string | string[] | undefined>): string {
  const qs = new URLSearchParams()
  for (const k of ['q', 'departmentId', 'status', 'sort', 'order']) {
    const v = params[k]
    if (typeof v === 'string' && v) qs.set(k, v)
  }
  return qs.toString()
}
