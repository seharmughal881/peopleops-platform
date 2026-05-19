'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/db/client'
import { requireUser, requirePermission } from '@/lib/modules/auth'
import { recordAudit } from '@/lib/modules/audit'

const CreateKpiSchema = z.object({
  employeeId: z.string().min(1),
  name: z.string().min(1).max(160),
  description: z.string().max(2000).optional(),
  unit: z.string().max(20).optional(),
  target: z.coerce.number(),
  actual: z.coerce.number().default(0),
  period: z.string().min(1).max(40),
})

const UpdateActualSchema = z.object({
  id: z.string().min(1),
  actual: z.coerce.number(),
})

async function ensureManagerOrAdmin(employeeId: string) {
  const user = await requireUser()
  if (user.permissions.includes('*') || user.permissions.includes('performance:*')) return user
  if (!user.employee) throw new Error('Forbidden')
  const subject = await prisma.employee.findUnique({ where: { id: employeeId }, select: { managerId: true } })
  if (subject?.managerId !== user.employee.id) throw new Error('Forbidden')
  return user
}

export async function createKpi(formData: FormData) {
  const parsed = CreateKpiSchema.safeParse({
    employeeId: formData.get('employeeId'),
    name: formData.get('name'),
    description: formData.get('description') || undefined,
    unit: formData.get('unit') || undefined,
    target: formData.get('target'),
    actual: formData.get('actual') || 0,
    period: formData.get('period'),
  })
  if (!parsed.success) return { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors }

  const actor = await ensureManagerOrAdmin(parsed.data.employeeId)
  if (!actor.employee) return { error: 'No employee record' }

  const kpi = await prisma.kPI.create({
    data: { ...parsed.data, createdById: actor.employee.id },
  })
  await recordAudit({
    userId: actor.id,
    action: 'kpi.created',
    entityType: 'KPI',
    entityId: kpi.id,
    after: { employeeId: kpi.employeeId, name: kpi.name, target: kpi.target, period: kpi.period },
  })
  revalidatePath('/admin/performance/kpi')
  revalidatePath('/performance/kpi')
  return { ok: true }
}

export async function updateKpiActual(formData: FormData) {
  const parsed = UpdateActualSchema.safeParse({
    id: formData.get('id'),
    actual: formData.get('actual'),
  })
  if (!parsed.success) return { error: 'Validation failed' }

  const kpi = await prisma.kPI.findUnique({ where: { id: parsed.data.id } })
  if (!kpi) return { error: 'Not found' }

  const user = await requireUser()
  const isOwn = user.employee && kpi.employeeId === user.employee.id
  if (!isOwn) await ensureManagerOrAdmin(kpi.employeeId)

  await prisma.kPI.update({ where: { id: kpi.id }, data: { actual: parsed.data.actual } })
  await recordAudit({
    userId: user.id,
    action: 'kpi.actual.updated',
    entityType: 'KPI',
    entityId: kpi.id,
    before: { actual: kpi.actual },
    after: { actual: parsed.data.actual },
  })
  revalidatePath('/admin/performance/kpi')
  revalidatePath('/performance/kpi')
  return { ok: true }
}

export async function closeKpi(formData: FormData) {
  const id = String(formData.get('id') || '')
  const kpi = await prisma.kPI.findUnique({ where: { id } })
  if (!kpi) return { error: 'Not found' }
  const actor = await ensureManagerOrAdmin(kpi.employeeId)
  await prisma.kPI.update({ where: { id }, data: { status: 'closed' } })
  await recordAudit({ userId: actor.id, action: 'kpi.closed', entityType: 'KPI', entityId: id })
  revalidatePath('/admin/performance/kpi')
  revalidatePath('/performance/kpi')
  return { ok: true }
}

export async function listMyKpis(employeeId: string) {
  return prisma.kPI.findMany({
    where: { employeeId },
    orderBy: [{ status: 'asc' }, { period: 'desc' }, { createdAt: 'desc' }],
  })
}

export async function listKpisForReport(opts: { period?: string } = {}) {
  return prisma.kPI.findMany({
    where: opts.period ? { period: opts.period } : undefined,
    include: { employee: { select: { firstName: true, lastName: true, employeeCode: true } } },
    orderBy: [{ period: 'desc' }, { status: 'asc' }, { createdAt: 'desc' }],
    take: 200,
  })
}
