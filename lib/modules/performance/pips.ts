'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/client'
import { requireUser } from '@/lib/modules/auth'
import { recordAudit } from '@/lib/modules/audit'
import { notify } from '@/lib/modules/notifications'
import { CreatePIPSchema, ClosePIPSchema, type PIPGoal } from './schemas'

function isManagerOrAdmin(perms: string[], roles: string[]): boolean {
  return perms.includes('*') || perms.includes('employee:read') || roles.includes('manager')
}

export async function createPIP(formData: FormData) {
  const user = await requireUser()
  if (!user.employee) return { error: 'No employee record' }
  if (!isManagerOrAdmin(user.permissions, user.roles)) return { error: 'Forbidden' }

  const titles = formData.getAll('goalTitle').map(String)
  const dueDates = formData.getAll('goalDueDate').map(String)
  const goals: PIPGoal[] = titles
    .map((t, i) => ({ title: t, dueDate: dueDates[i] || undefined, status: 'pending' as const }))
    .filter((g) => g.title.trim().length > 0)

  const parsed = CreatePIPSchema.safeParse({
    subjectId: formData.get('subjectId'),
    startDate: formData.get('startDate'),
    endDate: formData.get('endDate'),
    reason: formData.get('reason'),
    goals,
  })
  if (!parsed.success) {
    const flat = parsed.error.flatten()
    return { error: flat.formErrors[0] ?? 'Validation failed', fieldErrors: flat.fieldErrors }
  }

  const existing = await prisma.pIP.findFirst({
    where: { subjectId: parsed.data.subjectId, status: 'active' },
  })
  if (existing) return { error: 'Subject already has an active PIP' }

  const pip = await prisma.pIP.create({
    data: {
      subjectId: parsed.data.subjectId,
      managerId: user.employee.id,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      reason: parsed.data.reason,
      goals: JSON.stringify(parsed.data.goals),
    },
    include: { subject: { include: { user: true } } },
  })

  await notify({
    userId: pip.subject.user.id,
    title: 'Performance Improvement Plan opened',
    body: 'Your manager has opened a PIP. Please review the goals.',
    link: '/performance',
  })

  await recordAudit({
    userId: user.id,
    action: 'pip.created',
    entityType: 'PIP',
    entityId: pip.id,
    after: { subjectId: pip.subjectId, goals: parsed.data.goals.length },
  })

  revalidatePath('/manager/performance')
  revalidatePath('/admin/performance')
  return { ok: true, pipId: pip.id }
}

export async function addPIPCheckpoint(formData: FormData) {
  const user = await requireUser()
  if (!user.employee) return { error: 'No employee record' }

  const id = String(formData.get('id') || '')
  const notes = String(formData.get('notes') || '')
  if (!notes) return { error: 'Notes are required' }

  const pip = await prisma.pIP.findUnique({ where: { id } })
  if (!pip) return { error: 'Not found' }
  if (pip.managerId !== user.employee.id && !user.permissions.includes('*')) return { error: 'Forbidden' }

  let checkpoints: Array<{ date: string; notes: string; by: string }>
  try {
    checkpoints = JSON.parse(pip.checkpoints) || []
  } catch {
    checkpoints = []
  }
  checkpoints.push({ date: new Date().toISOString(), notes, by: `${user.employee.firstName} ${user.employee.lastName}` })

  await prisma.pIP.update({
    where: { id },
    data: { checkpoints: JSON.stringify(checkpoints) },
  })

  await recordAudit({
    userId: user.id,
    action: 'pip.checkpoint',
    entityType: 'PIP',
    entityId: id,
    after: { count: checkpoints.length },
  })

  revalidatePath('/manager/performance')
  revalidatePath('/admin/performance')
  return { ok: true }
}

export async function closePIP(formData: FormData) {
  const user = await requireUser()
  if (!user.employee) return { error: 'No employee record' }

  const parsed = ClosePIPSchema.safeParse({
    id: formData.get('id'),
    outcome: formData.get('outcome'),
  })
  if (!parsed.success) return { error: 'Validation failed' }

  const pip = await prisma.pIP.findUnique({
    where: { id: parsed.data.id },
    include: { subject: { include: { user: true } } },
  })
  if (!pip) return { error: 'Not found' }
  if (pip.managerId !== user.employee.id && !user.permissions.includes('*')) return { error: 'Forbidden' }
  if (pip.status !== 'active') return { error: 'PIP already closed' }

  await prisma.pIP.update({
    where: { id: pip.id },
    data: { status: parsed.data.outcome, closedAt: new Date() },
  })

  await notify({
    userId: pip.subject.user.id,
    title: `PIP closed — ${parsed.data.outcome}`,
    link: '/performance',
  })

  await recordAudit({
    userId: user.id,
    action: `pip.${parsed.data.outcome}`,
    entityType: 'PIP',
    entityId: pip.id,
  })

  revalidatePath('/manager/performance')
  revalidatePath('/admin/performance')
  return { ok: true }
}
