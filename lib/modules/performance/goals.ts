'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/client'
import { requireUser } from '@/lib/modules/auth'
import { recordAudit } from '@/lib/modules/audit'
import { CreateGoalSchema, UpdateProgressSchema } from './schemas'

async function canManageGoal(actorEmployeeId: string, targetEmployeeId: string, perms: string[]): Promise<boolean> {
  if (actorEmployeeId === targetEmployeeId) return true
  if (perms.includes('*') || perms.includes('employee:read')) return true
  const target = await prisma.employee.findUnique({ where: { id: targetEmployeeId }, select: { managerId: true } })
  return target?.managerId === actorEmployeeId
}

export async function createGoal(formData: FormData) {
  const user = await requireUser()
  if (!user.employee) return { error: 'No employee record' }

  const parsed = CreateGoalSchema.safeParse({
    employeeId: formData.get('employeeId') || user.employee.id,
    title: formData.get('title'),
    description: formData.get('description') || undefined,
    type: formData.get('type') || 'objective',
    targetDate: formData.get('targetDate') || undefined,
    parentId: formData.get('parentId') || undefined,
  })
  if (!parsed.success) return { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors }

  if (!(await canManageGoal(user.employee.id, parsed.data.employeeId, user.permissions))) {
    return { error: 'Forbidden' }
  }

  const goal = await prisma.goal.create({
    data: {
      ...parsed.data,
      createdById: user.employee.id,
    },
  })

  await recordAudit({
    userId: user.id,
    action: 'goal.created',
    entityType: 'Goal',
    entityId: goal.id,
    after: { title: goal.title, type: goal.type, employeeId: goal.employeeId },
  })

  revalidatePath('/performance')
  revalidatePath('/manager/performance')
  return { ok: true, goalId: goal.id }
}

export async function updateGoalProgress(formData: FormData) {
  const user = await requireUser()
  if (!user.employee) return { error: 'No employee record' }

  const parsed = UpdateProgressSchema.safeParse({
    id: formData.get('id'),
    progress: formData.get('progress'),
    status: formData.get('status') || undefined,
  })
  if (!parsed.success) return { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors }

  const goal = await prisma.goal.findUnique({ where: { id: parsed.data.id } })
  if (!goal) return { error: 'Not found' }
  if (!(await canManageGoal(user.employee.id, goal.employeeId, user.permissions))) {
    return { error: 'Forbidden' }
  }

  const updated = await prisma.goal.update({
    where: { id: goal.id },
    data: {
      progress: parsed.data.progress,
      status: parsed.data.status ?? (parsed.data.progress === 100 ? 'completed' : goal.status),
    },
  })

  await recordAudit({
    userId: user.id,
    action: 'goal.updated',
    entityType: 'Goal',
    entityId: goal.id,
    before: { progress: goal.progress, status: goal.status },
    after: { progress: updated.progress, status: updated.status },
  })

  revalidatePath('/performance')
  revalidatePath('/manager/performance')
  return { ok: true }
}

export async function deleteGoal(formData: FormData) {
  const user = await requireUser()
  if (!user.employee) return { error: 'No employee record' }

  const id = String(formData.get('id') || '')
  const goal = await prisma.goal.findUnique({ where: { id } })
  if (!goal) return { error: 'Not found' }
  if (!(await canManageGoal(user.employee.id, goal.employeeId, user.permissions))) {
    return { error: 'Forbidden' }
  }
  await prisma.goal.delete({ where: { id } })
  await recordAudit({
    userId: user.id,
    action: 'goal.deleted',
    entityType: 'Goal',
    entityId: id,
  })
  revalidatePath('/performance')
  revalidatePath('/manager/performance')
  return { ok: true }
}
