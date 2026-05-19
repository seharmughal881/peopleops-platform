import { prisma } from '@/lib/db/client'

export async function listAssets(opts: { status?: string; category?: string } = {}) {
  return prisma.asset.findMany({
    where: {
      ...(opts.status ? { status: opts.status } : {}),
      ...(opts.category ? { category: opts.category } : {}),
    },
    include: {
      assignments: {
        where: { returnedAt: null },
        include: { employee: { select: { firstName: true, lastName: true, employeeCode: true } } },
      },
    },
    orderBy: [{ status: 'asc' }, { tag: 'asc' }],
  })
}

export async function getAsset(id: string) {
  return prisma.asset.findUnique({
    where: { id },
    include: {
      assignments: {
        include: { employee: { select: { firstName: true, lastName: true, employeeCode: true } } },
        orderBy: { assignedAt: 'desc' },
      },
    },
  })
}

export async function listLicenses() {
  const licenses = await prisma.softwareLicense.findMany({
    include: {
      assignments: {
        where: { revokedAt: null },
        select: { id: true },
      },
    },
    orderBy: { name: 'asc' },
  })
  return licenses.map((l) => ({ ...l, seatsUsed: l.assignments.length }))
}

export async function getLicense(id: string) {
  const license = await prisma.softwareLicense.findUnique({
    where: { id },
    include: {
      assignments: {
        include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } },
        orderBy: [{ revokedAt: 'asc' }, { assignedAt: 'desc' }],
      },
    },
  })
  if (!license) return null
  return { ...license, seatsUsed: license.assignments.filter((a) => !a.revokedAt).length }
}

export async function myAssetsAndLicenses(employeeId: string) {
  const [assets, licenses] = await Promise.all([
    prisma.assetAssignment.findMany({
      where: { employeeId, returnedAt: null },
      include: { asset: true },
      orderBy: { assignedAt: 'desc' },
    }),
    prisma.licenseAssignment.findMany({
      where: { employeeId, revokedAt: null },
      include: { license: true },
      orderBy: { assignedAt: 'desc' },
    }),
  ])
  return { assets, licenses }
}

export async function assetsKPIs() {
  const rows = await prisma.asset.groupBy({ by: ['status'], _count: { _all: true } })
  const map = Object.fromEntries(rows.map((r) => [r.status, r._count._all]))
  const totalValue = await prisma.asset.aggregate({ _sum: { purchaseCost: true } })
  return {
    total: rows.reduce((s, r) => s + r._count._all, 0),
    available: map.available ?? 0,
    assigned: map.assigned ?? 0,
    maintenance: map.maintenance ?? 0,
    retired: map.retired ?? 0,
    totalValue: totalValue._sum.purchaseCost ?? 0,
  }
}
