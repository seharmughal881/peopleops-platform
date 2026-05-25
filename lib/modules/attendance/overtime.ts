export const STANDARD_WORK_HOURS = 8
export const OVERTIME_GRACE_HOURS = 1

export interface BreakInput {
  startedAt: Date
  endedAt: Date | null
  type: string // 'regular' | 'namaz'
}

export interface AttendanceTotals {
  grossMs: number
  regularBreakMs: number
  namazBreakMs: number
  netHours: number
  extraHours: number
  overtimeHours: number
}

export function computeAttendanceTotals(
  clockIn: Date,
  clockOut: Date,
  breaks: BreakInput[],
): AttendanceTotals {
  const grossMs = Math.max(0, clockOut.getTime() - clockIn.getTime())

  let regularBreakMs = 0
  let namazBreakMs = 0
  for (const b of breaks) {
    const end = b.endedAt ?? clockOut
    const ms = Math.max(0, end.getTime() - b.startedAt.getTime())
    if (b.type === 'namaz') namazBreakMs += ms
    else regularBreakMs += ms
  }

  const netMs = Math.max(0, grossMs - regularBreakMs)
  const netHours = netMs / 3600000
  const extraHours = Math.max(0, netHours - STANDARD_WORK_HOURS)
  const overtimeHours = Math.max(0, extraHours - OVERTIME_GRACE_HOURS)

  return {
    grossMs,
    regularBreakMs,
    namazBreakMs,
    netHours,
    extraHours,
    overtimeHours,
  }
}
