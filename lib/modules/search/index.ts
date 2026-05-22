'use server'

import { prisma } from '@/lib/db/client'
import { requireUser } from '@/lib/modules/auth'
import { hasPermission } from '@/lib/modules/auth/rbac'

const PER_GROUP_LIMIT = 5
const MIN_QUERY_LENGTH = 2

export interface SearchHit {
  id: string
  label: string
  sublabel?: string
  href: string
}

export interface SearchResult {
  people: SearchHit[]
  departments: SearchHit[]
  policies: SearchHit[]
  leave: SearchHit[]
}

const insensitive = { mode: 'insensitive' as const }

export async function globalSearch(rawQuery: string): Promise<SearchResult> {
  const user = await requireUser()
  const query = rawQuery.trim()
  const empty: SearchResult = { people: [], departments: [], policies: [], leave: [] }
  if (query.length < MIN_QUERY_LENGTH) return empty

  const canReadEmployees = hasPermission(user.permissions, 'employee:read')
  const canApproveLeave = hasPermission(user.permissions, 'leave:approve')

  const [people, departments, policies, leave] = await Promise.all([
    canReadEmployees
      ? prisma.employee.findMany({
          where: {
            OR: [
              { firstName: { contains: query, ...insensitive } },
              { lastName: { contains: query, ...insensitive } },
              { employeeCode: { contains: query, ...insensitive } },
              { jobTitle: { contains: query, ...insensitive } },
              { user: { is: { email: { contains: query, ...insensitive } } } },
            ],
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            jobTitle: true,
            user: { select: { email: true } },
            department: { select: { name: true } },
          },
          take: PER_GROUP_LIMIT,
          orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        })
      : Promise.resolve([]),
    prisma.department.findMany({
      where: { name: { contains: query, ...insensitive } },
      select: { id: true, name: true },
      take: PER_GROUP_LIMIT,
      orderBy: { name: 'asc' },
    }),
    prisma.policy.findMany({
      where: {
        active: true,
        OR: [
          { title: { contains: query, ...insensitive } },
          { category: { contains: query, ...insensitive } },
        ],
      },
      select: { id: true, title: true, category: true },
      take: PER_GROUP_LIMIT,
      orderBy: { updatedAt: 'desc' },
    }),
    canApproveLeave
      ? prisma.leaveRequest.findMany({
          where: {
            OR: [
              { reason: { contains: query, ...insensitive } },
              { leaveType: { contains: query, ...insensitive } },
              { status: { contains: query, ...insensitive } },
              {
                employee: {
                  is: {
                    OR: [
                      { firstName: { contains: query, ...insensitive } },
                      { lastName: { contains: query, ...insensitive } },
                    ],
                  },
                },
              },
            ],
          },
          select: {
            id: true,
            leaveType: true,
            status: true,
            startDate: true,
            endDate: true,
            employee: { select: { firstName: true, lastName: true } },
          },
          take: PER_GROUP_LIMIT,
          orderBy: { createdAt: 'desc' },
        })
      : Promise.resolve([]),
  ])

  const fmtDate = (d: Date) => d.toISOString().slice(0, 10)
  const fmtRange = (start: Date, end: Date) => {
    const s = fmtDate(start)
    const e = fmtDate(end)
    return s === e ? s : `${s} → ${e}`
  }

  return {
    people: people.map((p) => ({
      id: p.id,
      label: `${p.firstName} ${p.lastName}`,
      sublabel: [p.jobTitle, p.department?.name, p.employeeCode].filter(Boolean).join(' · '),
      href: `/admin/employees/${p.id}`,
    })),
    departments: departments.map((d) => ({
      id: d.id,
      label: d.name,
      sublabel: 'Department',
      href: `/admin/employees?department=${d.id}`,
    })),
    policies: policies.map((p) => ({
      id: p.id,
      label: p.title,
      sublabel: p.category.replace(/_/g, ' '),
      href: canReadEmployees ? `/admin/policies/${p.id}` : `/policies`,
    })),
    leave: leave.map((l) => ({
      id: l.id,
      label: `${l.employee.firstName} ${l.employee.lastName} · ${l.leaveType}`,
      sublabel: `${l.status} · ${fmtRange(l.startDate, l.endDate)}`,
      href: '/manager/approvals',
    })),
  }
}
