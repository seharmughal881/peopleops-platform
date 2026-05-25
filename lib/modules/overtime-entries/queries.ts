import 'server-only'
import { prisma } from '@/lib/db/client'

export async function myOvertimeEntries(employeeId: string, opts: { days?: number } = {}) {
  const days = opts.days ?? 60
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  return prisma.overtimeEntry.findMany({
    where: { employeeId, workDate: { gte: since } },
    orderBy: [{ workDate: 'desc' }, { createdAt: 'desc' }],
  })
}

export async function approvedOvertimeEntriesInRange(employeeId: string, start: Date, end: Date) {
  return prisma.overtimeEntry.findMany({
    where: {
      employeeId,
      status: 'approved',
      workDate: { gte: start, lt: end },
    },
    orderBy: { workDate: 'asc' },
  })
}

export async function pendingOvertimeApprovalsFor(approverId: string) {
  const approvals = await prisma.approval.findMany({
    where: { approverId, status: 'pending', entityType: 'OvertimeEntry' },
    orderBy: { createdAt: 'desc' },
  })

  const ids = approvals.map((a) => a.entityId)
  const entries = await prisma.overtimeEntry.findMany({
    where: { id: { in: ids } },
    include: { employee: true },
  })

  const entryById = new Map(entries.map((e) => [e.id, e]))
  return approvals.map((a) => ({ approval: a, entry: entryById.get(a.entityId) }))
}
