import { requirePermission } from '@/lib/modules/auth'
import { listEmployeesPaged } from '@/lib/modules/employee/queries'
import { recordAudit } from '@/lib/modules/audit'
import { xlsxResponse, rowsToXlsxBuffer, type ExportColumn } from '@/lib/export'

export const dynamic = 'force-dynamic'

type SortField = 'name' | 'employeeCode' | 'email' | 'jobTitle' | 'department' | 'status'
const SORT_FIELDS: ReadonlyArray<SortField> = ['name', 'employeeCode', 'email', 'jobTitle', 'department', 'status']

export async function GET(req: Request) {
  const actor = await requirePermission('employee:read')
  const url = new URL(req.url)
  const sp = url.searchParams

  const sortRaw = sp.get('sort') ?? undefined
  const sort = sortRaw && (SORT_FIELDS as readonly string[]).includes(sortRaw)
    ? (sortRaw as SortField)
    : undefined
  const orderRaw = sp.get('order')
  const order = orderRaw === 'desc' ? 'desc' : 'asc'

  const { rows, total } = await listEmployeesPaged({
    q: sp.get('q') ?? undefined,
    departmentId: sp.get('departmentId') ?? undefined,
    status: sp.get('status') ?? undefined,
    sort,
    order,
    page: 1,
    pageSize: 10_000,
  })

  type Row = (typeof rows)[number]
  const columns: ExportColumn<Row>[] = [
    { key: 'employeeCode', header: 'Code', value: (e) => e.employeeCode },
    { key: 'firstName', header: 'First name', value: (e) => e.firstName },
    { key: 'lastName', header: 'Last name', value: (e) => e.lastName },
    { key: 'email', header: 'Email', value: (e) => e.user.email },
    { key: 'jobTitle', header: 'Title', value: (e) => e.jobTitle ?? '' },
    { key: 'department', header: 'Department', value: (e) => e.department?.name ?? '' },
    { key: 'joinDate', header: 'Join date', value: (e) => e.joinDate.toISOString().slice(0, 10) },
    { key: 'status', header: 'Status', value: (e) => e.status },
  ]

  await recordAudit({
    userId: actor.id,
    action: 'employees.export.xlsx',
    entityType: 'Employee',
    after: { count: total, filters: Object.fromEntries(sp.entries()) },
  })

  const buf = rowsToXlsxBuffer(rows, columns, 'Employees')
  const stamp = new Date().toISOString().slice(0, 10)
  return xlsxResponse(buf, `employees_${stamp}.xlsx`)
}
