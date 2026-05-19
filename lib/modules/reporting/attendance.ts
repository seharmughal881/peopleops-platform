import 'server-only'
import { prisma } from '@/lib/db/client'
import { daysAgo } from './_time'

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
