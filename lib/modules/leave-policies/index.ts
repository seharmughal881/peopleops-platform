'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/db/client'
import { requirePermission } from '@/lib/modules/auth'
import { recordAudit } from '@/lib/modules/audit'

const LEAVE_TYPES = ['vacation', 'sick', 'personal', 'unpaid'] as const

const LeavePolicySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  leaveType: z.enum(LEAVE_TYPES),
  annualEntitlement: z.coerce.number().min(0).max(365),
  carryForwardMax: z.coerce.number().min(0).max(365),
  active: z.coerce.boolean().default(true),
})

function parse(formData: FormData) {
  return LeavePolicySchema.safeParse({
    name: formData.get('name'),
    leaveType: formData.get('leaveType'),
    annualEntitlement: formData.get('annualEntitlement'),
    carryForwardMax: formData.get('carryForwardMax'),
    active: formData.get('active') === 'on' || formData.get('active') === 'true',
  })
}

export async function listLeavePolicies() {
  return prisma.leavePolicy.findMany({ orderBy: [{ active: 'desc' }, { name: 'asc' }] })
}

export async function createLeavePolicy(formData: FormData) {
  const actor = await requirePermission('policy:*')
  const parsed = parse(formData)
  if (!parsed.success) {
    return { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors }
  }

  try {
    const policy = await prisma.leavePolicy.create({ data: parsed.data })
    await recordAudit({
      userId: actor.id,
      action: 'leave-policy.created',
      entityType: 'LeavePolicy',
      entityId: policy.id,
      after: parsed.data,
    })
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'code' in e && (e as { code?: string }).code === 'P2002') {
      return { error: 'A policy with that name already exists' }
    }
    throw e
  }

  revalidatePath('/admin/leave-policies')
  return { ok: true }
}

export async function updateLeavePolicy(formData: FormData) {
  const actor = await requirePermission('policy:*')
  const id = String(formData.get('id') || '')
  if (!id) return { error: 'Missing id' }

  const existing = await prisma.leavePolicy.findUnique({ where: { id } })
  if (!existing) return { error: 'Policy not found' }

  const parsed = parse(formData)
  if (!parsed.success) {
    return { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors }
  }

  try {
    await prisma.leavePolicy.update({ where: { id }, data: parsed.data })
    await recordAudit({
      userId: actor.id,
      action: 'leave-policy.updated',
      entityType: 'LeavePolicy',
      entityId: id,
      before: {
        name: existing.name,
        leaveType: existing.leaveType,
        annualEntitlement: existing.annualEntitlement,
        carryForwardMax: existing.carryForwardMax,
        active: existing.active,
      },
      after: parsed.data,
    })
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'code' in e && (e as { code?: string }).code === 'P2002') {
      return { error: 'A policy with that name already exists' }
    }
    throw e
  }

  revalidatePath('/admin/leave-policies')
  return { ok: true }
}

export async function toggleLeavePolicyActive(formData: FormData) {
  const actor = await requirePermission('policy:*')
  const id = String(formData.get('id') || '')
  const existing = await prisma.leavePolicy.findUnique({ where: { id } })
  if (!existing) return { error: 'Policy not found' }

  const updated = await prisma.leavePolicy.update({
    where: { id },
    data: { active: !existing.active },
  })
  await recordAudit({
    userId: actor.id,
    action: updated.active ? 'leave-policy.activated' : 'leave-policy.archived',
    entityType: 'LeavePolicy',
    entityId: id,
  })
  revalidatePath('/admin/leave-policies')
  return { ok: true }
}

export async function deleteLeavePolicy(formData: FormData) {
  const actor = await requirePermission('policy:*')
  const id = String(formData.get('id') || '')
  const existing = await prisma.leavePolicy.findUnique({ where: { id } })
  if (!existing) return { error: 'Policy not found' }

  await prisma.leavePolicy.delete({ where: { id } })
  await recordAudit({
    userId: actor.id,
    action: 'leave-policy.deleted',
    entityType: 'LeavePolicy',
    entityId: id,
    before: {
      name: existing.name,
      leaveType: existing.leaveType,
      annualEntitlement: existing.annualEntitlement,
      carryForwardMax: existing.carryForwardMax,
    },
  })
  revalidatePath('/admin/leave-policies')
  return { ok: true }
}
