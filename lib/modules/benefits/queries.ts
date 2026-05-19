import { prisma } from '@/lib/db/client'

export async function listPlans(opts: { activeOnly?: boolean } = {}) {
  return prisma.benefitPlan.findMany({
    where: opts.activeOnly ? { active: true } : undefined,
    orderBy: [{ active: 'desc' }, { type: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { enrollments: true } } },
  })
}

export async function getPlan(id: string) {
  return prisma.benefitPlan.findUnique({
    where: { id },
    include: {
      enrollments: {
        include: {
          employee: { select: { firstName: true, lastName: true, employeeCode: true } },
          dependents: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })
}

export async function myEnrollments(employeeId: string) {
  return prisma.benefitEnrollment.findMany({
    where: { employeeId },
    include: { plan: true, dependents: true },
    orderBy: [{ status: 'asc' }, { effectiveFrom: 'desc' }],
  })
}

export async function getEnrollment(id: string) {
  return prisma.benefitEnrollment.findUnique({
    where: { id },
    include: { plan: true, employee: true, dependents: true },
  })
}

export async function enrollmentSummary() {
  const rows = await prisma.benefitEnrollment.groupBy({
    by: ['status'],
    _count: { _all: true },
  })
  return rows.map((r) => ({ status: r.status, count: r._count._all }))
}
