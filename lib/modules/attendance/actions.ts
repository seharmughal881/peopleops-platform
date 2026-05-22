'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/client'
import { requireUser } from '@/lib/modules/auth'
import { recordAudit } from '@/lib/modules/audit'
import { notifyAttendance, notifyBreak } from '@/lib/modules/integrations/slack'
import { activeShiftFor, shiftEndDate } from './shift-lookup'

export async function clockIn(formData?: FormData) {
  const user = await requireUser()
  if (!user.employee) throw new Error('No employee record')

  const open = await prisma.attendanceLog.findFirst({
    where: { employeeId: user.employee.id, clockOut: null },
  })
  if (open) return { error: 'You are already clocked in.' }

  const log = await prisma.attendanceLog.create({
    data: {
      employeeId: user.employee.id,
      clockIn: new Date(),
      source: (formData?.get('source') as string) || 'web',
      geoLat: formData?.get('lat') ? Number(formData.get('lat')) : null,
      geoLng: formData?.get('lng') ? Number(formData.get('lng')) : null,
    },
  })

  await recordAudit({
    userId: user.id,
    action: 'attendance.clockIn',
    entityType: 'AttendanceLog',
    entityId: log.id,
  })

  await notifyAttendance({
    employeeName: `${user.employee.firstName} ${user.employee.lastName}`,
    action: 'in',
    at: log.clockIn,
    source: log.source,
  })

  revalidatePath('/attendance')
  return { ok: true, logId: log.id }
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

  // Recompute net hours after auto-closing breaks
  const breaks = await prisma.breakEvent.findMany({
    where: { attendanceLogId: open.id },
  })
  const breakMs = breaks.reduce((sum, b) => sum + ((b.endedAt ?? now).getTime() - b.startedAt.getTime()), 0)
  const grossMs = now.getTime() - new Date(open.clockIn).getTime()
  const netMs = Math.max(0, grossMs - breakMs)
  const hours = netMs / 3600000

  // Overtime: any time clocked out past the assigned shift end. Falls back to
  // hours > 8.5 if the employee has no shift assigned for today.
  const shift = await activeShiftFor(user.employee.id, new Date(open.clockIn))
  let status: 'regular' | 'overtime' = 'regular'
  if (shift) {
    if (now.getTime() > shiftEndDate(new Date(open.clockIn), shift).getTime()) status = 'overtime'
  } else if (hours > 8.5) {
    status = 'overtime'
  }

  const updated = await prisma.attendanceLog.update({
    where: { id: open.id },
    data: { clockOut: now, status },
  })

  await recordAudit({
    userId: user.id,
    action: 'attendance.clockOut',
    entityType: 'AttendanceLog',
    entityId: updated.id,
    after: { hours: Number(hours.toFixed(2)), breakMinutes: Math.round(breakMs / 60000) },
  })

  await notifyAttendance({
    employeeName: `${user.employee.firstName} ${user.employee.lastName}`,
    action: 'out',
    at: now,
    source: open.source,
    hours: Number(hours.toFixed(2)),
  })

  revalidatePath('/attendance')
  return { ok: true, hours: Number(hours.toFixed(2)) }
}

export async function startBreak() {
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
    data: { attendanceLogId: open.id },
  })
  await recordAudit({
    userId: user.id,
    action: 'attendance.breakStart',
    entityType: 'BreakEvent',
    entityId: ev.id,
  })

  await notifyBreak({
    employeeName: `${user.employee.firstName} ${user.employee.lastName}`,
    action: 'start',
    at: ev.startedAt,
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
    })
  }

  revalidatePath('/attendance')
  return { ok: true }
}
