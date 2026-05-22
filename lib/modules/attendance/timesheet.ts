import 'server-only'
import { prisma } from '@/lib/db/client'
import { activeShiftFor, shiftEndDate } from './shift-lookup'

function startOfWeek(d: Date): Date {
  const x = new Date(d)
  const day = x.getDay() // 0=Sun
  const diff = (day + 6) % 7 // ISO: week starts Monday
  x.setHours(0, 0, 0, 0)
  x.setDate(x.getDate() - diff)
  return x
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export interface TimesheetDay {
  date: string // YYYY-MM-DD
  hours: number
  overtimeHours: number
  logs: number
}

export interface TimesheetWeek {
  weekStart: string
  weekEnd: string
  totalHours: number
  totalOvertimeHours: number
  days: TimesheetDay[]
}

function dayKey(d: Date): string {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export async function weeklyTimesheet(employeeId: string, weekStart?: Date): Promise<TimesheetWeek> {
  const start = startOfWeek(weekStart ?? new Date())
  const end = addDays(start, 7)

  const logs = await prisma.attendanceLog.findMany({
    where: {
      employeeId,
      clockIn: { gte: start, lt: end },
    },
    orderBy: { clockIn: 'asc' },
  })

  const dayMap = new Map<string, TimesheetDay>()
  for (let i = 0; i < 7; i++) {
    const d = addDays(start, i)
    dayMap.set(dayKey(d), { date: dayKey(d), hours: 0, overtimeHours: 0, logs: 0 })
  }

  for (const log of logs) {
    if (!log.clockOut) continue // skip open sessions
    const clockInDate = new Date(log.clockIn)
    const clockOutDate = new Date(log.clockOut)
    const key = dayKey(clockInDate)
    const day = dayMap.get(key)
    if (!day) continue
    const hours = (clockOutDate.getTime() - clockInDate.getTime()) / 3600000
    day.hours += hours
    const shift = await activeShiftFor(employeeId, clockInDate)
    if (shift) {
      const overtimeMs = clockOutDate.getTime() - shiftEndDate(clockInDate, shift).getTime()
      if (overtimeMs > 0) day.overtimeHours += overtimeMs / 3600000
    } else if (hours > 8.5) {
      day.overtimeHours += hours - 8.5
    }
    day.logs += 1
  }

  let totalHours = 0
  let totalOvertimeHours = 0
  const days = Array.from(dayMap.values())
  for (const d of days) {
    d.hours = Number(d.hours.toFixed(2))
    d.overtimeHours = Number(d.overtimeHours.toFixed(2))
    totalHours += d.hours
    totalOvertimeHours += d.overtimeHours
  }

  return {
    weekStart: dayKey(start),
    weekEnd: dayKey(addDays(start, 6)),
    totalHours: Number(totalHours.toFixed(2)),
    totalOvertimeHours: Number(totalOvertimeHours.toFixed(2)),
    days,
  }
}

export async function teamTimesheetSummary(managerEmployeeId: string, weekStart?: Date) {
  const reports = await prisma.employee.findMany({
    where: { managerId: managerEmployeeId, status: 'active' },
    select: { id: true, firstName: true, lastName: true, employeeCode: true },
  })
  const sheets = await Promise.all(
    reports.map(async (r) => ({
      employee: r,
      sheet: await weeklyTimesheet(r.id, weekStart),
    })),
  )
  return sheets
}
