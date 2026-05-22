'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/db/client'
import { requirePermission } from '@/lib/modules/auth'
import { recordAudit } from '@/lib/modules/audit'

const PatternSchema = z.object({
  name: z.string().min(1).max(80),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  breakMinutes: z.coerce.number().int().min(0).max(240),
  workDays: z.string().regex(/^[0-6](,[0-6])*$/, 'Use CSV of weekday numbers 0-6 (0=Sun)'),
})

export async function createShiftPattern(formData: FormData) {
  const actor = await requirePermission('attendance:*')
  const parsed = PatternSchema.safeParse({
    name: formData.get('name'),
    startTime: formData.get('startTime'),
    endTime: formData.get('endTime'),
    breakMinutes: formData.get('breakMinutes'),
    workDays: formData.get('workDays') || '1,2,3,4,5',
  })
  if (!parsed.success) return { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors }

  try {
    const row = await prisma.shiftPattern.create({ data: parsed.data })
    await recordAudit({
      userId: actor.id,
      action: 'shift.created',
      entityType: 'ShiftPattern',
      entityId: row.id,
      after: parsed.data,
    })
  } catch (e: any) {
    if (e?.code === 'P2002') return { error: 'A shift pattern with that name already exists' }
    throw e
  }

  revalidatePath('/admin/shifts')
  return { ok: true }
}

export async function updateShiftPattern(formData: FormData) {
  const actor = await requirePermission('attendance:*')
  const id = String(formData.get('id') || '')
  if (!id) return { error: 'Missing id' }
  const parsed = PatternSchema.safeParse({
    name: formData.get('name'),
    startTime: formData.get('startTime'),
    endTime: formData.get('endTime'),
    breakMinutes: formData.get('breakMinutes'),
    workDays: formData.get('workDays') || '1,2,3,4,5',
  })
  if (!parsed.success) return { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors }

  const before = await prisma.shiftPattern.findUnique({ where: { id } })
  if (!before) return { error: 'Not found' }

  try {
    await prisma.shiftPattern.update({ where: { id }, data: parsed.data })
  } catch (e: any) {
    if (e?.code === 'P2002') return { error: 'A shift pattern with that name already exists' }
    throw e
  }
  await recordAudit({
    userId: actor.id,
    action: 'shift.updated',
    entityType: 'ShiftPattern',
    entityId: id,
    before,
    after: parsed.data,
  })
  revalidatePath('/admin/shifts')
  return { ok: true }
}

export async function deleteShiftPattern(formData: FormData) {
  const actor = await requirePermission('attendance:*')
  const id = String(formData.get('id') || '')
  if (!id) return { error: 'Missing id' }
  const inUse = await prisma.employeeShift.count({ where: { shiftPatternId: id } })
  if (inUse > 0) {
    return { error: `Cannot delete: ${inUse} employee assignment(s) reference this pattern.` }
  }
  await prisma.shiftPattern.delete({ where: { id } })
  await recordAudit({
    userId: actor.id,
    action: 'shift.deleted',
    entityType: 'ShiftPattern',
    entityId: id,
  })
  revalidatePath('/admin/shifts')
  return { ok: true }
}

const AssignSchema = z.object({
  employeeIds: z.array(z.string().min(1)).min(1, 'Select at least one employee'),
  shiftPatternId: z.string().min(1),
  effectiveFrom: z.coerce.date(),
  effectiveTo: z.coerce.date().optional(),
}).refine((d) => !d.effectiveTo || d.effectiveTo >= d.effectiveFrom, {
  message: 'Effective-to must be on or after effective-from',
  path: ['effectiveTo'],
})

export async function assignShift(formData: FormData) {
  const actor = await requirePermission('attendance:*')
  const rawEnd = formData.get('effectiveTo')
  const parsed = AssignSchema.safeParse({
    employeeIds: formData.getAll('employeeIds').map(String).filter(Boolean),
    shiftPatternId: formData.get('shiftPatternId'),
    effectiveFrom: formData.get('effectiveFrom'),
    effectiveTo: rawEnd ? String(rawEnd) : undefined,
  })
  if (!parsed.success) return { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors }

  const { employeeIds, shiftPatternId, effectiveFrom, effectiveTo } = parsed.data
  const rows = await prisma.$transaction(
    employeeIds.map((employeeId) =>
      prisma.employeeShift.create({
        data: { employeeId, shiftPatternId, effectiveFrom, effectiveTo },
      }),
    ),
  )
  for (const row of rows) {
    await recordAudit({
      userId: actor.id,
      action: 'shift.assigned',
      entityType: 'EmployeeShift',
      entityId: row.id,
      after: { employeeId: row.employeeId, shiftPatternId, effectiveFrom, effectiveTo },
    })
  }
  revalidatePath('/admin/shifts')
  return { ok: true, count: rows.length }
}

export async function endAssignment(formData: FormData) {
  const actor = await requirePermission('attendance:*')
  const id = String(formData.get('id') || '')
  if (!id) return { error: 'Missing id' }
  const endsAt = formData.get('effectiveTo')
    ? new Date(String(formData.get('effectiveTo')))
    : new Date()
  endsAt.setHours(0, 0, 0, 0)
  await prisma.employeeShift.update({ where: { id }, data: { effectiveTo: endsAt } })
  await recordAudit({
    userId: actor.id,
    action: 'shift.assignment.ended',
    entityType: 'EmployeeShift',
    entityId: id,
    after: { effectiveTo: endsAt },
  })
  revalidatePath('/admin/shifts')
  return { ok: true }
}

export async function deleteAssignment(formData: FormData) {
  const actor = await requirePermission('attendance:*')
  const id = String(formData.get('id') || '')
  if (!id) return { error: 'Missing id' }
  await prisma.employeeShift.delete({ where: { id } })
  await recordAudit({
    userId: actor.id,
    action: 'shift.assignment.deleted',
    entityType: 'EmployeeShift',
    entityId: id,
  })
  revalidatePath('/admin/shifts')
  return { ok: true }
}

export async function listShiftPatterns() {
  return prisma.shiftPattern.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { employeeShifts: true } } },
  })
}

export async function listShiftAssignments() {
  return prisma.employeeShift.findMany({
    orderBy: { effectiveFrom: 'desc' },
    take: 100,
    include: {
      employee: { select: { firstName: true, lastName: true, employeeCode: true } },
      shiftPattern: { select: { name: true, startTime: true, endTime: true } },
    },
  })
}
