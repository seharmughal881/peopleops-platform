import 'server-only'
import { prisma } from '@/lib/db/client'
import { monthsBack, monthBucket } from './_time'

export async function headcountByDepartment() {
  const rows = await prisma.employee.groupBy({
    by: ['departmentId'],
    _count: { _all: true },
    where: { status: 'active' },
  })
  const depts = await prisma.department.findMany()
  const nameById = new Map(depts.map((d) => [d.id, d.name]))
  return rows
    .map((r) => ({
      department: r.departmentId ? nameById.get(r.departmentId) ?? 'Unknown' : 'Unassigned',
      count: r._count._all,
    }))
    .sort((a, b) => b.count - a.count)
}

export async function headcountTotals() {
  const [active, onLeave, terminated] = await Promise.all([
    prisma.employee.count({ where: { status: 'active' } }),
    prisma.employee.count({ where: { status: 'onLeave' } }),
    prisma.employee.count({ where: { status: 'terminated' } }),
  ])
  return { active, onLeave, terminated, total: active + onLeave + terminated }
}

// Hires and exits per month for the last N months.
// Exits are approximated from `updatedAt` on terminated employees because the
// schema has no dedicated separationDate field; this is good enough for trends
// but not for legal/audit-grade attrition (use EmploymentHistory.endDate when
// that becomes the source of truth).
export async function headcountMonthlyFlow(months = 12) {
  const start = monthsBack(months - 1)
  const buckets = monthBucket(start, new Date())

  const [hires, exits] = await Promise.all([
    prisma.employee.findMany({
      where: { joinDate: { gte: start } },
      select: { joinDate: true },
    }),
    prisma.employee.findMany({
      where: { status: 'terminated', updatedAt: { gte: start } },
      select: { updatedAt: true },
    }),
  ])

  const hireByKey = new Map<string, number>()
  for (const h of hires) {
    const k = monthKey(h.joinDate)
    hireByKey.set(k, (hireByKey.get(k) ?? 0) + 1)
  }
  const exitByKey = new Map<string, number>()
  for (const e of exits) {
    const k = monthKey(e.updatedAt)
    exitByKey.set(k, (exitByKey.get(k) ?? 0) + 1)
  }

  return buckets.map((b) => ({
    label: b.short,
    key: b.key,
    hires: hireByKey.get(b.key) ?? 0,
    exits: exitByKey.get(b.key) ?? 0,
    net: (hireByKey.get(b.key) ?? 0) - (exitByKey.get(b.key) ?? 0),
  }))
}

export async function tenureDistribution() {
  const employees = await prisma.employee.findMany({
    where: { status: 'active' },
    select: { joinDate: true },
  })
  const now = Date.now()
  const buckets = [
    { label: '< 1 yr', min: 0, max: 1 },
    { label: '1–3 yrs', min: 1, max: 3 },
    { label: '3–5 yrs', min: 3, max: 5 },
    { label: '5–10 yrs', min: 5, max: 10 },
    { label: '10+ yrs', min: 10, max: Infinity },
  ]
  const counts = buckets.map((b) => ({ label: b.label, value: 0 }))
  for (const e of employees) {
    const years = (now - e.joinDate.getTime()) / (365.25 * 86400000)
    const idx = buckets.findIndex((b) => years >= b.min && years < b.max)
    if (idx >= 0) counts[idx].value++
  }
  return counts
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
