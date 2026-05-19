'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/db/client'
import { requirePermission } from '@/lib/modules/auth'
import { recordAudit } from '@/lib/modules/audit'

const CreateShiftSchema = z.object({
  name: z.string().min(1).max(80),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  breakMinutes: z.coerce.number().int().min(0).max(240),
  workDays: z.string().regex(/^[0-6](,[0-6])*$/, 'Use CSV of weekday numbers 0-6 (0=Sun)'),
})

export async function createShiftPattern(formData: FormData) {
  const actor = await requirePermission('attendance:*')
  const parsed = CreateShiftSchema.safeParse({
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

const AssignSchema = z.object({
  employeeId: z.string().min(1),
  shiftPatternId: z.string().min(1),
  effectiveFrom: z.coerce.date(),
})

export async function assignShift(formData: FormData) {
  const actor = await requirePermission('attendance:*')
  const parsed = AssignSchema.safeParse({
    employeeId: formData.get('employeeId'),
    shiftPatternId: formData.get('shiftPatternId'),
    effectiveFrom: formData.get('effectiveFrom'),
  })
  if (!parsed.success) return { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors }

  const row = await prisma.employeeShift.create({ data: parsed.data })
  await recordAudit({
    userId: actor.id,
    action: 'shift.assigned',
    entityType: 'EmployeeShift',
    entityId: row.id,
    after: parsed.data,
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
