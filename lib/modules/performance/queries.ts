import { prisma } from '@/lib/db/client'

export async function myGoals(employeeId: string) {
  return prisma.goal.findMany({
    where: { employeeId },
    include: { createdBy: { select: { firstName: true, lastName: true } } },
    orderBy: [{ status: 'asc' }, { targetDate: 'asc' }],
  })
}

export async function teamGoals(managerId: string) {
  const reports = await prisma.employee.findMany({ where: { managerId }, select: { id: true } })
  const ids = reports.map((r) => r.id)
  return prisma.goal.findMany({
    where: { employeeId: { in: ids } },
    include: { employee: { select: { firstName: true, lastName: true, employeeCode: true } } },
    orderBy: [{ status: 'asc' }, { targetDate: 'asc' }],
  })
}

export async function listCycles() {
  return prisma.reviewCycle.findMany({
    orderBy: { startDate: 'desc' },
    include: { _count: { select: { reviews: true } } },
  })
}

export async function getCycle(id: string) {
  return prisma.reviewCycle.findUnique({ where: { id } })
}

export async function myReviewsToWrite(reviewerId: string) {
  return prisma.review.findMany({
    where: { reviewerId, status: 'pending' },
    include: {
      cycle: { select: { name: true, endDate: true } },
      subject: { select: { firstName: true, lastName: true, employeeCode: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function myReviewsAboutMe(subjectId: string) {
  return prisma.review.findMany({
    where: { subjectId, status: 'submitted' },
    include: {
      cycle: { select: { name: true } },
      reviewer: { select: { firstName: true, lastName: true } },
    },
    orderBy: { submittedAt: 'desc' },
  })
}

export async function reviewsForCycle(cycleId: string) {
  return prisma.review.findMany({
    where: { cycleId },
    include: {
      subject: { select: { firstName: true, lastName: true, employeeCode: true } },
      reviewer: { select: { firstName: true, lastName: true } },
    },
    orderBy: [{ subjectId: 'asc' }, { type: 'asc' }],
  })
}

export async function teamActivePIPs(managerId: string) {
  return prisma.pIP.findMany({
    where: { managerId, status: 'active' },
    include: { subject: { select: { firstName: true, lastName: true, employeeCode: true } } },
    orderBy: { startDate: 'desc' },
  })
}

export async function listAllPIPs() {
  return prisma.pIP.findMany({
    include: {
      subject: { select: { firstName: true, lastName: true, employeeCode: true } },
      manager: { select: { firstName: true, lastName: true } },
    },
    orderBy: { startDate: 'desc' },
  })
}

export async function getPIP(id: string) {
  return prisma.pIP.findUnique({
    where: { id },
    include: {
      subject: { include: { user: { select: { email: true } } } },
      manager: true,
    },
  })
}

export async function myActivePIP(subjectId: string) {
  return prisma.pIP.findFirst({
    where: { subjectId, status: 'active' },
    include: { manager: { select: { firstName: true, lastName: true } } },
  })
}

export async function performanceKPIs() {
  const [goals, activeCycles, pipsActive] = await Promise.all([
    prisma.goal.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.reviewCycle.count({ where: { status: 'active' } }),
    prisma.pIP.count({ where: { status: 'active' } }),
  ])
  const map = Object.fromEntries(goals.map((g) => [g.status, g._count._all]))
  return {
    goalsActive: map.active ?? 0,
    goalsCompleted: map.completed ?? 0,
    goalsCancelled: map.cancelled ?? 0,
    activeCycles,
    pipsActive,
  }
}
