import { prisma } from '@/lib/db/client'

export async function listAllPromotions() {
  return prisma.promotionRecommendation.findMany({
    include: {
      subject: { select: { firstName: true, lastName: true, employeeCode: true, jobTitle: true } },
      recommendedBy: { select: { firstName: true, lastName: true } },
      department: { select: { name: true } },
    },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  })
}

export async function listPromotionsByManager(managerId: string) {
  return prisma.promotionRecommendation.findMany({
    where: { recommendedById: managerId },
    include: {
      subject: { select: { firstName: true, lastName: true, employeeCode: true } },
      department: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function myPendingPromotion(employeeId: string) {
  return prisma.promotionRecommendation.findFirst({
    where: { subjectId: employeeId, status: 'pending' },
    include: { recommendedBy: { select: { firstName: true, lastName: true } } },
  })
}

/**
 * Surface promotion candidates: employees on a manager's team whose latest review average is ≥ 4.5.
 * Excludes those with an active PIP or an existing pending recommendation.
 */
export async function suggestedCandidates(managerId: string) {
  const reports = await prisma.employee.findMany({
    where: { managerId, status: 'active' },
    select: { id: true, firstName: true, lastName: true, employeeCode: true, jobTitle: true },
  })
  if (reports.length === 0) return []

  const reportIds = reports.map((r) => r.id)

  // Average rating across submitted reviews
  const ratings = await prisma.review.groupBy({
    by: ['subjectId'],
    where: { subjectId: { in: reportIds }, status: 'submitted', rating: { not: null } },
    _avg: { rating: true },
    _count: { _all: true },
  })
  const ratingMap = new Map(ratings.map((r) => [r.subjectId, { avg: r._avg.rating ?? 0, count: r._count._all }]))

  // Exclude active PIPs + existing pending recommendations
  const [pips, existing] = await Promise.all([
    prisma.pIP.findMany({ where: { subjectId: { in: reportIds }, status: 'active' }, select: { subjectId: true } }),
    prisma.promotionRecommendation.findMany({
      where: { subjectId: { in: reportIds }, status: 'pending' },
      select: { subjectId: true },
    }),
  ])
  const excluded = new Set([...pips.map((p) => p.subjectId), ...existing.map((p) => p.subjectId)])

  return reports
    .filter((r) => !excluded.has(r.id))
    .map((r) => ({
      employee: r,
      avgRating: ratingMap.get(r.id)?.avg ?? null,
      reviewCount: ratingMap.get(r.id)?.count ?? 0,
    }))
    .filter((c) => c.avgRating !== null && c.avgRating >= 4.5)
    .sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0))
}
