import 'server-only'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db/client'

export async function getEmployeeById(id: string) {
  return prisma.employee.findUnique({
    where: { id },
    include: { user: { select: { email: true, status: true } }, department: true, profile: true },
  })
}

export async function getEmployeeByUserId(userId: string) {
  return prisma.employee.findUnique({
    where: { userId },
    include: { department: true, profile: true, manager: true },
  })
}

export async function listEmployees(opts: { departmentId?: string; status?: string } = {}) {
  return prisma.employee.findMany({
    where: {
      ...(opts.departmentId ? { departmentId: opts.departmentId } : {}),
      ...(opts.status ? { status: opts.status } : {}),
    },
    include: { department: true, user: { select: { email: true } } },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
  })
}

type SortField = 'name' | 'employeeCode' | 'email' | 'jobTitle' | 'department' | 'status'

export interface ListEmployeesPagedOpts {
  q?: string
  departmentId?: string
  status?: string
  sort?: SortField
  order?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

export async function listEmployeesPaged(opts: ListEmployeesPagedOpts = {}) {
  const page = Math.max(1, opts.page ?? 1)
  const pageSize = Math.max(1, Math.min(200, opts.pageSize ?? 25))
  const skip = (page - 1) * pageSize

  const where = {
    ...(opts.departmentId ? { departmentId: opts.departmentId } : {}),
    ...(opts.status ? { status: opts.status } : {}),
    ...(opts.q
      ? {
          OR: [
            { firstName: { contains: opts.q, mode: 'insensitive' as const } },
            { lastName: { contains: opts.q, mode: 'insensitive' as const } },
            { employeeCode: { contains: opts.q, mode: 'insensitive' as const } },
            { jobTitle: { contains: opts.q, mode: 'insensitive' as const } },
            { user: { is: { email: { contains: opts.q, mode: 'insensitive' as const } } } },
          ],
        }
      : {}),
  }

  const order = opts.order ?? 'asc'
  type OrderBy =
    | Prisma.EmployeeOrderByWithRelationInput
    | Prisma.EmployeeOrderByWithRelationInput[]
  const orderBy: OrderBy = (() => {
    switch (opts.sort) {
      case 'employeeCode': return { employeeCode: order }
      case 'email': return { user: { email: order } }
      case 'jobTitle': return { jobTitle: order }
      case 'department': return { department: { name: order } }
      case 'status': return { status: order }
      case 'name':
      default:
        return [{ lastName: order }, { firstName: order }]
    }
  })()

  const [rows, total] = await Promise.all([
    prisma.employee.findMany({
      where,
      include: { department: true, user: { select: { email: true } } },
      orderBy,
      skip,
      take: pageSize,
    }),
    prisma.employee.count({ where }),
  ])

  return { rows, total, page, pageSize }
}

export async function listDirectReports(managerId: string) {
  return prisma.employee.findMany({
    where: { managerId },
    include: { department: true, user: { select: { email: true } } },
  })
}

export type OrgNode = Awaited<ReturnType<typeof listEmployees>>[number] & {
  reports: OrgNode[]
}

export async function getOrgChart(): Promise<OrgNode[]> {
  const employees = await listEmployees()
  const map = new Map<string, OrgNode>()
  for (const e of employees) map.set(e.id, { ...e, reports: [] })
  const roots: OrgNode[] = []
  for (const emp of map.values()) {
    const parent = emp.managerId ? map.get(emp.managerId) : undefined
    if (parent) parent.reports.push(emp)
    else roots.push(emp)
  }
  return roots
}
