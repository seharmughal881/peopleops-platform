import 'server-only'
import { prisma } from '@/lib/db/client'
import { daysAgo, startOfMonth, startOfNextMonth } from './_time'

// "Late" is anyone who clocked in after 09:30 local server time on their workday.
// This is a default until we wire shifts (lib/modules/attendance has shift logic
// that we should consolidate here in a later iteration).
const LATE_HOUR = 9
const LATE_MINUTE = 30

export async function attendanceInsights(days = 30) {
  const since = daysAgo(days)
  const logs = await prisma.attendanceLog.findMany({
    where: { clockIn: { gte: since } },
    select: { clockIn: true, clockOut: true, status: true, employeeId: true },
  })
  let totalHours = 0
  let overtimeCount = 0
  let missedCount = 0
  let lateCount = 0
  const dayKeys = new Set<string>()
  for (const l of logs) {
    if (l.clockOut) totalHours += (l.clockOut.getTime() - l.clockIn.getTime()) / 3600000
    if (l.status === 'overtime') overtimeCount++
    if (l.status === 'missed') missedCount++
    if (isLate(l.clockIn)) lateCount++
    dayKeys.add(l.clockIn.toISOString().slice(0, 10))
  }
  return {
    totalLogs: logs.length,
    totalHours: Math.round(totalHours * 10) / 10,
    avgDailyHours:
      dayKeys.size > 0 ? Math.round((totalHours / dayKeys.size) * 10) / 10 : 0,
    overtimeCount,
    missedCount,
    lateCount,
    daysCovered: dayKeys.size,
  }
}

export async function attendanceDailyTrend(days = 30) {
  const since = daysAgo(days)
  const logs = await prisma.attendanceLog.findMany({
    where: { clockIn: { gte: since } },
    select: { clockIn: true, status: true },
  })
  // bucket per day
  const bucket = new Map<string, { onTime: number; late: number; missed: number }>()
  for (let i = days - 1; i >= 0; i--) {
    const k = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)
    bucket.set(k, { onTime: 0, late: 0, missed: 0 })
  }
  for (const l of logs) {
    const k = l.clockIn.toISOString().slice(0, 10)
    const b = bucket.get(k)
    if (!b) continue
    if (l.status === 'missed') b.missed++
    else if (isLate(l.clockIn)) b.late++
    else b.onTime++
  }
  return [...bucket.entries()].map(([day, v]) => {
    const d = new Date(day)
    return {
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      onTime: v.onTime,
      late: v.late,
      missed: v.missed,
      total: v.onTime + v.late + v.missed,
    }
  })
}

export async function topLateComers(days = 30, limit = 10) {
  const since = daysAgo(days)
  const logs = await prisma.attendanceLog.findMany({
    where: { clockIn: { gte: since } },
    select: {
      clockIn: true,
      employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
    },
  })
  const counts = new Map<string, { name: string; code: string; count: number }>()
  for (const l of logs) {
    if (!isLate(l.clockIn)) continue
    const key = l.employee.id
    const cur = counts.get(key) ?? {
      name: `${l.employee.firstName} ${l.employee.lastName}`,
      code: l.employee.employeeCode,
      count: 0,
    }
    cur.count++
    counts.set(key, cur)
  }
  return [...counts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

export type DailyAttendanceRow = {
  employeeId: string
  employeeCode: string
  name: string
  department: string | null
  clockIn: Date
  clockOut: Date | null
  netHours: number | null
  overtimeHours: number
  status: string
  isLate: boolean
  regularBreakMinutes: number
  namazBreakMinutes: number
  openBreak: boolean
}

export async function dailyAttendanceRoster(forDate: Date = new Date()): Promise<DailyAttendanceRow[]> {
  const dayStart = new Date(forDate)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(dayStart)
  dayEnd.setDate(dayEnd.getDate() + 1)
  return attendanceRosterRange(dayStart, dayEnd)
}

export async function attendanceRosterRange(
  start: Date,
  end: Date,
): Promise<DailyAttendanceRow[]> {
  const logs = await prisma.attendanceLog.findMany({
    where: { clockIn: { gte: start, lt: end } },
    include: {
      breaks: { select: { startedAt: true, endedAt: true, type: true } },
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeCode: true,
          department: { select: { name: true } },
        },
      },
    },
    orderBy: { clockIn: 'asc' },
  })

  return logs.map((l) => {
    let regularMs = 0
    let namazMs = 0
    let openBreak = false
    for (const b of l.breaks) {
      const breakEnd = b.endedAt ?? new Date()
      if (!b.endedAt) openBreak = true
      const ms = Math.max(0, breakEnd.getTime() - b.startedAt.getTime())
      if (b.type === 'namaz') namazMs += ms
      else regularMs += ms
    }
    return {
      employeeId: l.employee.id,
      employeeCode: l.employee.employeeCode,
      name: `${l.employee.firstName} ${l.employee.lastName}`,
      department: l.employee.department?.name ?? null,
      clockIn: l.clockIn,
      clockOut: l.clockOut,
      netHours: l.netHours,
      overtimeHours: l.overtimeHours,
      status: l.status,
      isLate: isLate(l.clockIn),
      regularBreakMinutes: Math.round(regularMs / 60000),
      namazBreakMinutes: Math.round(namazMs / 60000),
      openBreak,
    }
  })
}

export type EmployeeAttendanceSummary = {
  employeeId: string
  employeeCode: string
  name: string
  department: string | null
  daysPresent: number
  lateDays: number
  totalMinutesLate: number
  totalHours: number
  overtimeHours: number
  missedDays: number
}

export function summarizeRosterByEmployee(
  rows: DailyAttendanceRow[],
): EmployeeAttendanceSummary[] {
  const map = new Map<string, EmployeeAttendanceSummary>()
  for (const r of rows) {
    const cur = map.get(r.employeeId) ?? {
      employeeId: r.employeeId,
      employeeCode: r.employeeCode,
      name: r.name,
      department: r.department,
      daysPresent: 0,
      lateDays: 0,
      totalMinutesLate: 0,
      totalHours: 0,
      overtimeHours: 0,
      missedDays: 0,
    }
    cur.daysPresent += 1
    if (r.isLate) {
      cur.lateDays += 1
      const lateBy =
        (r.clockIn.getHours() - LATE_HOUR) * 60 +
        (r.clockIn.getMinutes() - LATE_MINUTE)
      cur.totalMinutesLate += Math.max(0, lateBy)
    }
    if (r.netHours != null) cur.totalHours += r.netHours
    cur.overtimeHours += r.overtimeHours
    if (r.status === 'missed') cur.missedDays += 1
    map.set(r.employeeId, cur)
  }
  return [...map.values()]
    .map((s) => ({
      ...s,
      totalHours: Math.round(s.totalHours * 10) / 10,
      overtimeHours: Math.round(s.overtimeHours * 10) / 10,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export type MonthlyLateRow = {
  employeeId: string
  employeeCode: string
  name: string
  department: string | null
  clockIn: Date
  minutesLate: number
}

export async function monthlyLateCheckIns(ref: Date = new Date()): Promise<MonthlyLateRow[]> {
  const start = startOfMonth(ref)
  const end = startOfNextMonth(ref)
  const logs = await prisma.attendanceLog.findMany({
    where: { clockIn: { gte: start, lt: end } },
    select: {
      clockIn: true,
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeCode: true,
          department: { select: { name: true } },
        },
      },
    },
    orderBy: { clockIn: 'desc' },
  })
  const rows: MonthlyLateRow[] = []
  for (const l of logs) {
    if (!isLate(l.clockIn)) continue
    const lateBy = (l.clockIn.getHours() - LATE_HOUR) * 60 + (l.clockIn.getMinutes() - LATE_MINUTE)
    rows.push({
      employeeId: l.employee.id,
      employeeCode: l.employee.employeeCode,
      name: `${l.employee.firstName} ${l.employee.lastName}`,
      department: l.employee.department?.name ?? null,
      clockIn: l.clockIn,
      minutesLate: lateBy,
    })
  }
  return rows
}

export type MonthlyOvertimeRow = {
  employeeId: string
  employeeCode: string
  name: string
  department: string | null
  clockIn: Date
  clockOut: Date | null
  overtimeHours: number
  netHours: number | null
}

export async function monthlyOvertimeLogs(ref: Date = new Date()): Promise<MonthlyOvertimeRow[]> {
  const start = startOfMonth(ref)
  const end = startOfNextMonth(ref)
  const logs = await prisma.attendanceLog.findMany({
    where: { clockIn: { gte: start, lt: end }, overtimeHours: { gt: 0 } },
    select: {
      clockIn: true,
      clockOut: true,
      overtimeHours: true,
      netHours: true,
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeCode: true,
          department: { select: { name: true } },
        },
      },
    },
    orderBy: { overtimeHours: 'desc' },
  })
  return logs.map((l) => ({
    employeeId: l.employee.id,
    employeeCode: l.employee.employeeCode,
    name: `${l.employee.firstName} ${l.employee.lastName}`,
    department: l.employee.department?.name ?? null,
    clockIn: l.clockIn,
    clockOut: l.clockOut,
    overtimeHours: l.overtimeHours,
    netHours: l.netHours,
  }))
}

export async function monthlyAttendanceInsights(ref: Date = new Date()) {
  const start = startOfMonth(ref)
  const end = startOfNextMonth(ref)
  const logs = await prisma.attendanceLog.findMany({
    where: { clockIn: { gte: start, lt: end } },
    select: { clockIn: true, overtimeHours: true, status: true },
  })
  let lateCount = 0
  let overtimeHours = 0
  let missedCount = 0
  const dayKeys = new Set<string>()
  for (const l of logs) {
    if (isLate(l.clockIn)) lateCount++
    if (l.overtimeHours > 0) overtimeHours += l.overtimeHours
    if (l.status === 'missed') missedCount++
    dayKeys.add(l.clockIn.toISOString().slice(0, 10))
  }
  return {
    monthLabel: ref.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    totalLogs: logs.length,
    lateCount,
    overtimeHours: Math.round(overtimeHours * 10) / 10,
    missedCount,
    daysCovered: dayKeys.size,
  }
}

export async function topAbsentees(days = 30, limit = 10) {
  const since = daysAgo(days)
  const missed = await prisma.attendanceLog.findMany({
    where: { clockIn: { gte: since }, status: 'missed' },
    select: {
      employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
    },
  })
  const counts = new Map<string, { name: string; code: string; count: number }>()
  for (const l of missed) {
    const key = l.employee.id
    const cur = counts.get(key) ?? {
      name: `${l.employee.firstName} ${l.employee.lastName}`,
      code: l.employee.employeeCode,
      count: 0,
    }
    cur.count++
    counts.set(key, cur)
  }
  return [...counts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

function isLate(clockIn: Date): boolean {
  const h = clockIn.getHours()
  const m = clockIn.getMinutes()
  if (h > LATE_HOUR) return true
  if (h === LATE_HOUR && m > LATE_MINUTE) return true
  return false
}
