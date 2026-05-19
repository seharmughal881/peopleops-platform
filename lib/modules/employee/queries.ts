import 'server-only'
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
