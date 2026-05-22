import { prisma } from '@/lib/db/client'

export interface ShiftWindow {
  startTime: string
  endTime: string
  breakMinutes: number
  workDays: string
}

export async function activeShiftFor(
  employeeId: string,
  date: Date,
): Promise<ShiftWindow | null> {
  const dayStart = new Date(date)
  dayStart.setHours(0, 0, 0, 0)

  const assignment = await prisma.employeeShift.findFirst({
    where: {
      employeeId,
      effectiveFrom: { lte: dayStart },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: dayStart } }],
    },
    orderBy: { effectiveFrom: 'desc' },
    include: { shiftPattern: true },
  })
  if (!assignment) return null

  const weekday = date.getDay()
  const workDays = assignment.shiftPattern.workDays
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n))
  if (!workDays.includes(weekday)) return null

  return {
    startTime: assignment.shiftPattern.startTime,
    endTime: assignment.shiftPattern.endTime,
    breakMinutes: assignment.shiftPattern.breakMinutes,
    workDays: assignment.shiftPattern.workDays,
  }
}

export function shiftStartDate(date: Date, shift: { startTime: string }): Date {
  const [hh, mm] = shift.startTime.split(':').map(Number)
  const d = new Date(date)
  d.setHours(hh, mm, 0, 0)
  return d
}

export function shiftEndDate(date: Date, shift: { endTime: string }): Date {
  const [hh, mm] = shift.endTime.split(':').map(Number)
  const d = new Date(date)
  d.setHours(hh, mm, 0, 0)
  return d
}
