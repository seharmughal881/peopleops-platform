import 'server-only'
import { prisma } from '@/lib/db/client'

export async function myLeaveRequests(employeeId: string) {
  return prisma.leaveRequest.findMany({
    where: { employeeId },
    orderBy: { createdAt: 'desc' },
  })
}

export async function myLeaveBalances(employeeId: string) {
  const year = new Date().getFullYear()
  return prisma.leaveBalance.findMany({
    where: { employeeId, year },
    orderBy: { leaveType: 'asc' },
  })
}

export async function pendingLeaveApprovalsFor(approverId: string) {
  const approvals = await prisma.approval.findMany({
    where: { approverId, status: 'pending', entityType: 'LeaveRequest' },
    orderBy: { createdAt: 'desc' },
  })

  const ids = approvals.map((a) => a.entityId)
  const requests = await prisma.leaveRequest.findMany({
    where: { id: { in: ids } },
    include: { employee: true },
  })

  const requestById = new Map(requests.map((r) => [r.id, r]))
  return approvals.map((a) => ({ approval: a, request: requestById.get(a.entityId) }))
}

export async function listHolidays(country = 'US') {
  return prisma.holiday.findMany({ where: { country }, orderBy: { date: 'asc' } })
}
