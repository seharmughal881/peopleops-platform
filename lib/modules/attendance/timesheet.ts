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
  hours: number              // clocked hours (from AttendanceLog)
  overtimeHours: number      // shift-derived overtime from clocked hours + approved self-reported
  selfReportedHours: number  // approved OvertimeEntry hours for this date
  logs: number
}

export interface TimesheetWeek {
  weekStart: string
  weekEnd: string
  totalHours: number            // clocked + approved self-reported
  totalOvertimeHours: number    // shift overtime + approved self-reported
  totalSelfReportedHours: number
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

  const [logs, approvedOvertime] = await Promise.all([
    prisma.attendanceLog.findMany({
      where: { employeeId, clockIn: { gte: start, lt: end } },
      orderBy: { clockIn: 'asc' },
    }),
    prisma.overtimeEntry.findMany({
      where: { employeeId, status: 'approved', workDate: { gte: start, lt: end } },
      orderBy: { workDate: 'asc' },
    }),
  ])

  const dayMap = new Map<string, TimesheetDay>()
  for (let i = 0; i < 7; i++) {
    const d = addDays(start, i)
    dayMap.set(dayKey(d), { date: dayKey(d), hours: 0, overtimeHours: 0, selfReportedHours: 0, logs: 0 })
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

  // Roll approved self-reported entries into the day's totals. Self-reported
  // hours are added to both `hours` (so weekly total reflects all worked time)
  // and `overtimeHours` (since by definition they fall outside the shift).
  for (const ot of approvedOvertime) {
    const key = dayKey(new Date(ot.workDate))
    const day = dayMap.get(key)
    if (!day) continue
    day.selfReportedHours += ot.hours
    day.hours += ot.hours
    day.overtimeHours += ot.hours
  }

  let totalHours = 0
  let totalOvertimeHours = 0
  let totalSelfReportedHours = 0
  const days = Array.from(dayMap.values())
  for (const d of days) {
    d.hours = Number(d.hours.toFixed(2))
    d.overtimeHours = Number(d.overtimeHours.toFixed(2))
    d.selfReportedHours = Number(d.selfReportedHours.toFixed(2))
    totalHours += d.hours
    totalOvertimeHours += d.overtimeHours
    totalSelfReportedHours += d.selfReportedHours
  }

  return {
    weekStart: dayKey(start),
    weekEnd: dayKey(addDays(start, 6)),
    totalHours: Number(totalHours.toFixed(2)),
    totalOvertimeHours: Number(totalOvertimeHours.toFixed(2)),
    totalSelfReportedHours: Number(totalSelfReportedHours.toFixed(2)),
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
