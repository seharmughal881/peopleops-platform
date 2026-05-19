'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/db/client'
import { requireUser } from '@/lib/modules/auth'
import { recordAudit } from '@/lib/modules/audit'

const AddSkillSchema = z.object({
  skill: z.string().min(1).max(80),
  level: z.enum(['beginner', 'intermediate', 'expert']).optional(),
  certifiedAt: z.coerce.date().optional(),
  expiresAt: z.coerce.date().optional(),
})

export async function addMySkill(formData: FormData) {
  const user = await requireUser()
  if (!user.employee) return { error: 'No employee record' }

  const parsed = AddSkillSchema.safeParse({
    skill: formData.get('skill'),
    level: formData.get('level') || undefined,
    certifiedAt: formData.get('certifiedAt') || undefined,
    expiresAt: formData.get('expiresAt') || undefined,
  })
  if (!parsed.success) return { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors }

  const row = await prisma.employeeSkill.create({
    data: { employeeId: user.employee.id, ...parsed.data },
  })
  await recordAudit({
    userId: user.id,
    action: 'employee.skill.added',
    entityType: 'EmployeeSkill',
    entityId: row.id,
    after: parsed.data,
  })
  revalidatePath('/profile')
  return { ok: true }
}

export async function removeMySkill(formData: FormData) {
  const user = await requireUser()
  if (!user.employee) return { error: 'No employee record' }
  const id = String(formData.get('id') || '')
  const skill = await prisma.employeeSkill.findUnique({ where: { id } })
  if (!skill || skill.employeeId !== user.employee.id) return { error: 'Forbidden' }
  await prisma.employeeSkill.delete({ where: { id } })
  await recordAudit({
    userId: user.id,
    action: 'employee.skill.removed',
    entityType: 'EmployeeSkill',
    entityId: id,
  })
  revalidatePath('/profile')
  return { ok: true }
}

export async function listMySkills(employeeId: string) {
  return prisma.employeeSkill.findMany({
    where: { employeeId },
    orderBy: { skill: 'asc' },
  })
}
