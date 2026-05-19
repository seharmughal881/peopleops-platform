import 'server-only'
import { prisma } from '@/lib/db/client'

export async function getOpenLog(employeeId: string) {
  return prisma.attendanceLog.findFirst({
    where: { employeeId, clockOut: null },
    orderBy: { clockIn: 'desc' },
    include: { breaks: { orderBy: { startedAt: 'desc' } } },
  })
}

export async function listMyAttendance(employeeId: string, opts: { days?: number } = {}) {
  const days = opts.days ?? 30
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  return prisma.attendanceLog.findMany({
    where: { employeeId, clockIn: { gte: since } },
    include: { breaks: true },
    orderBy: { clockIn: 'desc' },
  })
}

export async function listTeamAttendance(managerId: string) {
  const reports = await prisma.employee.findMany({ where: { managerId }, select: { id: true } })
  const ids = reports.map((r) => r.id)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return prisma.attendanceLog.findMany({
    where: { employeeId: { in: ids }, clockIn: { gte: today } },
    include: { employee: { select: { firstName: true, lastName: true } } },
    orderBy: { clockIn: 'desc' },
  })
}
