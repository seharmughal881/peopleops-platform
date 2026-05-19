import 'server-only'
import { prisma } from '@/lib/db/client'
import { monthBucket, monthsBack, startOfYear } from './_time'

// Attrition KPIs for a window.
// rate = separations / avg headcount over the window. Avg headcount is
// approximated as the midpoint between current active count and the
// best-effort active count at window start (active now - hires + exits).
// This is a heuristic; for audit-grade numbers replace with daily snapshots.
export async function attritionForWindow(since: Date) {
  const [separations, activeNow, hiresInWindow] = await Promise.all([
    prisma.employee.count({
      where: { status: 'terminated', updatedAt: { gte: since } },
    }),
    prisma.employee.count({ where: { status: 'active' } }),
    prisma.employee.count({ where: { joinDate: { gte: since } } }),
  ])
  const activeAtStart = Math.max(activeNow - hiresInWindow + separations, 1)
  const avgHeadcount = (activeNow + activeAtStart) / 2
  const rate = avgHeadcount > 0 ? (separations / avgHeadcount) * 100 : 0
  return {
    separations,
    activeNow,
    hiresInWindow,
    avgHeadcount: Math.round(avgHeadcount),
    rate: Math.round(rate * 10) / 10,
  }
}

export async function attritionThisYear() {
  return attritionForWindow(startOfYear())
}

export async function attritionMonthlyTrend(months = 12) {
  const start = monthsBack(months - 1)
  const buckets = monthBucket(start, new Date())
  const exits = await prisma.employee.findMany({
    where: { status: 'terminated', updatedAt: { gte: start } },
    select: { updatedAt: true },
  })
  const byKey = new Map<string, number>()
  for (const e of exits) {
    const k = `${e.updatedAt.getFullYear()}-${String(e.updatedAt.getMonth() + 1).padStart(2, '0')}`
    byKey.set(k, (byKey.get(k) ?? 0) + 1)
  }
  return buckets.map((b) => ({ label: b.short, value: byKey.get(b.key) ?? 0 }))
}

export async function attritionByDepartment(since: Date) {
  const exits = await prisma.employee.findMany({
    where: { status: 'terminated', updatedAt: { gte: since } },
    select: { departmentId: true },
  })
  const depts = await prisma.department.findMany()
  const nameById = new Map(depts.map((d) => [d.id, d.name]))
  const counts = new Map<string, number>()
  for (const e of exits) {
    const name = e.departmentId ? nameById.get(e.departmentId) ?? 'Unknown' : 'Unassigned'
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([department, count]) => ({ department, count }))
    .sort((a, b) => b.count - a.count)
}

export async function attritionByTenure(since: Date) {
  const exits = await prisma.employee.findMany({
    where: { status: 'terminated', updatedAt: { gte: since } },
    select: { joinDate: true, updatedAt: true },
  })
  const buckets = [
    { label: '< 1 yr', min: 0, max: 1 },
    { label: '1–3 yrs', min: 1, max: 3 },
    { label: '3–5 yrs', min: 3, max: 5 },
    { label: '5+ yrs', min: 5, max: Infinity },
  ]
  const counts = buckets.map((b) => ({ label: b.label, value: 0 }))
  for (const e of exits) {
    const years = (e.updatedAt.getTime() - e.joinDate.getTime()) / (365.25 * 86400000)
    const idx = buckets.findIndex((b) => years >= b.min && years < b.max)
    if (idx >= 0) counts[idx].value++
  }
  return counts
}
