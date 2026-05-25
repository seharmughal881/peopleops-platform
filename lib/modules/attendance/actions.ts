'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/client'
import { requireUser } from '@/lib/modules/auth'
import { recordAudit } from '@/lib/modules/audit'
import { notifyAttendance, notifyBreak, notifyLateCheckIn } from '@/lib/modules/integrations/slack'
import { computeAttendanceTotals } from './overtime'
import { activeShiftFor, shiftStartDate } from './shift-lookup'

const LATE_GRACE_MINUTES = 20

export async function clockIn(formData?: FormData) {
  const user = await requireUser()
  if (!user.employee) throw new Error('No employee record')

  const open = await prisma.attendanceLog.findFirst({
    where: { employeeId: user.employee.id, clockOut: null },
  })
  if (open) return { error: 'You are already clocked in.' }

  const now = new Date()
  const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1)

  // The late-check-in sweep may have created a "missed" placeholder for today
  // (with clockIn=clockOut=shiftStart). Convert it into a real clock-in instead
  // of creating a duplicate row.
  const placeholder = await prisma.attendanceLog.findFirst({
    where: {
      employeeId: user.employee.id,
      source: 'system',
      status: 'missed',
      clockIn: { gte: dayStart, lt: dayEnd },
    },
    orderBy: { clockIn: 'asc' },
  })

  const source = (formData?.get('source') as string) || 'web'
  const geoLat = formData?.get('lat') ? Number(formData.get('lat')) : null
  const geoLng = formData?.get('lng') ? Number(formData.get('lng')) : null

  const log = placeholder
    ? await prisma.attendanceLog.update({
        where: { id: placeholder.id },
        data: {
          clockIn: now,
          clockOut: null,
          status: 'regular',
          source,
          geoLat,
          geoLng,
          netHours: null,
          overtimeHours: 0,
        },
      })
    : await prisma.attendanceLog.create({
        data: { employeeId: user.employee.id, clockIn: now, source, geoLat, geoLng },
      })

  await recordAudit({
    userId: user.id,
    action: 'attendance.clockIn',
    entityType: 'AttendanceLog',
    entityId: log.id,
  })

  const employeeName = `${user.employee.firstName} ${user.employee.lastName}`

  await notifyAttendance({
    employeeName,
    action: 'in',
    at: log.clockIn,
    source: log.source,
  })

  // Late check-in detection at clock-in time. Handles the case where the
  // background sweep hasn't fired yet (cron is 5-min granular), so a 24-min
  // late check-in still triggers the Slack DM immediately. Idempotent:
  // skips if lateAlertedAt is already stamped (sweep beat us to it).
  const shift = await activeShiftFor(user.employee.id, now)
  if (shift && !log.lateAlertedAt) {
    const shiftStart = shiftStartDate(now, shift)
    const minutesLate = Math.floor((now.getTime() - shiftStart.getTime()) / 60000)
    if (minutesLate >= LATE_GRACE_MINUTES) {
      await notifyLateCheckIn({ employeeEmail: user.email, shiftStart, minutesLate, variant: 'late-arrival' })
      await prisma.attendanceLog.update({
        where: { id: log.id },
        data: { lateAlertedAt: now },
      })
    }
  }

  revalidatePath('/attendance')
  return { ok: true, logId: log.id, recoveredLatePlaceholder: !!placeholder }
}

export async function clockOut() {
  const user = await requireUser()
  if (!user.employee) throw new Error('No employee record')

  const open = await prisma.attendanceLog.findFirst({
    where: { employeeId: user.employee.id, clockOut: null },
    orderBy: { clockIn: 'desc' },
    include: { breaks: true },
  })
  if (!open) return { error: 'No active clock-in.' }

  const now = new Date()

  // Auto-close any open break at clock-out time
  await prisma.breakEvent.updateMany({
    where: { attendanceLogId: open.id, endedAt: null },
    data: { endedAt: now },
  })

  // Recompute totals after auto-closing breaks.
  // Rules:
  //  - regular breaks deduct from working time
  //  - namaz breaks are exempt (counted as working time)
  //  - overtime = max(0, netHours - 8 - 1hr grace)
  const breaks = await prisma.breakEvent.findMany({
    where: { attendanceLogId: open.id },
  })
  const totals = computeAttendanceTotals(new Date(open.clockIn), now, breaks)
  const status: 'regular' | 'overtime' = totals.overtimeHours > 0 ? 'overtime' : 'regular'

  const updated = await prisma.attendanceLog.update({
    where: { id: open.id },
    data: {
      clockOut: now,
      status,
      netHours: Number(totals.netHours.toFixed(2)),
      overtimeHours: Number(totals.overtimeHours.toFixed(2)),
    },
  })

  await recordAudit({
    userId: user.id,
    action: 'attendance.clockOut',
    entityType: 'AttendanceLog',
    entityId: updated.id,
    after: {
      netHours: Number(totals.netHours.toFixed(2)),
      overtimeHours: Number(totals.overtimeHours.toFixed(2)),
      regularBreakMinutes: Math.round(totals.regularBreakMs / 60000),
      namazBreakMinutes: Math.round(totals.namazBreakMs / 60000),
    },
  })

  await notifyAttendance({
    employeeName: `${user.employee.firstName} ${user.employee.lastName}`,
    action: 'out',
    at: now,
    source: open.source,
    hours: Number(totals.netHours.toFixed(2)),
  })

  revalidatePath('/attendance')
  return {
    ok: true,
    hours: Number(totals.netHours.toFixed(2)),
    overtimeHours: Number(totals.overtimeHours.toFixed(2)),
  }
}

export type BreakType = 'regular' | 'namaz'

export async function startBreak(type: BreakType = 'regular') {
  const user = await requireUser()
  if (!user.employee) throw new Error('No employee record')

  const open = await prisma.attendanceLog.findFirst({
    where: { employeeId: user.employee.id, clockOut: null },
    orderBy: { clockIn: 'desc' },
  })
  if (!open) return { error: 'You must be clocked in to take a break.' }

  const activeBreak = await prisma.breakEvent.findFirst({
    where: { attendanceLogId: open.id, endedAt: null },
  })
  if (activeBreak) return { error: 'A break is already in progress.' }

  const ev = await prisma.breakEvent.create({
    data: { attendanceLogId: open.id, type },
  })
  await recordAudit({
    userId: user.id,
    action: 'attendance.breakStart',
    entityType: 'BreakEvent',
    entityId: ev.id,
    after: { type },
  })

  await notifyBreak({
    employeeName: `${user.employee.firstName} ${user.employee.lastName}`,
    action: 'start',
    at: ev.startedAt,
    type,
  })

  revalidatePath('/attendance')
  return { ok: true }
}

export async function endBreak() {
  const user = await requireUser()
  if (!user.employee) throw new Error('No employee record')

  const open = await prisma.attendanceLog.findFirst({
    where: { employeeId: user.employee.id, clockOut: null },
    orderBy: { clockIn: 'desc' },
  })
  if (!open) return { error: 'No active clock-in.' }

  const activeBreak = await prisma.breakEvent.findFirst({
    where: { attendanceLogId: open.id, endedAt: null },
  })
  if (!activeBreak) return { error: 'No break is currently in progress.' }

  const ended = await prisma.breakEvent.update({
    where: { id: activeBreak.id },
    data: { endedAt: new Date() },
  })
  await recordAudit({
    userId: user.id,
    action: 'attendance.breakEnd',
    entityType: 'BreakEvent',
    entityId: ended.id,
  })

  if (ended.endedAt) {
    await notifyBreak({
      employeeName: `${user.employee.firstName} ${user.employee.lastName}`,
      action: 'end',
      startedAt: ended.startedAt,
      endedAt: ended.endedAt,
      type: (ended.type as BreakType) ?? 'regular',
    })
  }

  revalidatePath('/attendance')
  return { ok: true }
}
