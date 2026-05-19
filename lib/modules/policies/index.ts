'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/db/client'
import { requireUser, requirePermission } from '@/lib/modules/auth'
import { recordAudit } from '@/lib/modules/audit'

const CATEGORIES = ['general', 'code_of_conduct', 'security', 'hr', 'finance'] as const

const PolicySchema = z.object({
  title: z.string().min(1).max(200),
  category: z.enum(CATEGORIES).default('general'),
  body: z.string().min(1).max(40000),
  requiresAck: z.coerce.boolean().default(true),
})

export async function createPolicy(formData: FormData) {
  const actor = await requirePermission('employee:read')
  const parsed = PolicySchema.safeParse({
    title: formData.get('title'),
    category: formData.get('category') || 'general',
    body: formData.get('body'),
    requiresAck: formData.get('requiresAck') === 'on' || formData.get('requiresAck') === 'true',
  })
  if (!parsed.success) return { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors }

  const policy = await prisma.policy.create({
    data: { ...parsed.data, authorId: actor.id },
  })
  await recordAudit({
    userId: actor.id,
    action: 'policy.published',
    entityType: 'Policy',
    entityId: policy.id,
    after: { title: policy.title, category: policy.category, version: policy.version },
  })
  revalidatePath('/admin/policies')
  revalidatePath('/policies')
  return { ok: true, id: policy.id }
}

export async function updatePolicy(formData: FormData) {
  const actor = await requirePermission('employee:read')
  const id = String(formData.get('id') || '')
  const existing = await prisma.policy.findUnique({ where: { id } })
  if (!existing) return { error: 'Not found' }

  const parsed = PolicySchema.safeParse({
    title: formData.get('title'),
    category: formData.get('category') || existing.category,
    body: formData.get('body'),
    requiresAck: formData.get('requiresAck') === 'on' || formData.get('requiresAck') === 'true',
  })
  if (!parsed.success) return { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors }

  const bumpVersion = parsed.data.body !== existing.body
  const updated = await prisma.policy.update({
    where: { id },
    data: {
      ...parsed.data,
      version: bumpVersion ? existing.version + 1 : existing.version,
      publishedAt: bumpVersion ? new Date() : existing.publishedAt,
    },
  })
  await recordAudit({
    userId: actor.id,
    action: 'policy.updated',
    entityType: 'Policy',
    entityId: id,
    before: { version: existing.version },
    after: { version: updated.version, bumped: bumpVersion },
  })
  revalidatePath('/admin/policies')
  revalidatePath('/policies')
  return { ok: true }
}

export async function togglePolicyActive(formData: FormData) {
  const actor = await requirePermission('employee:read')
  const id = String(formData.get('id') || '')
  const policy = await prisma.policy.findUnique({ where: { id } })
  if (!policy) return { error: 'Not found' }
  await prisma.policy.update({ where: { id }, data: { active: !policy.active } })
  await recordAudit({
    userId: actor.id,
    action: policy.active ? 'policy.archived' : 'policy.reactivated',
    entityType: 'Policy',
    entityId: id,
  })
  revalidatePath('/admin/policies')
  return { ok: true }
}

export async function acknowledgePolicy(formData: FormData) {
  const user = await requireUser()
  const policyId = String(formData.get('policyId') || '')
  const policy = await prisma.policy.findUnique({ where: { id: policyId } })
  if (!policy) return { error: 'Not found' }
  if (!policy.active) return { error: 'Policy is not active' }

  const existing = await prisma.policyAcknowledgement.findUnique({
    where: { policyId_userId_version: { policyId, userId: user.id, version: policy.version } },
  })
  if (existing) return { ok: true } // idempotent

  await prisma.policyAcknowledgement.create({
    data: { policyId, userId: user.id, version: policy.version },
  })
  await recordAudit({
    userId: user.id,
    action: 'policy.acknowledged',
    entityType: 'Policy',
    entityId: policyId,
    after: { version: policy.version },
  })
  revalidatePath('/policies')
  revalidatePath('/admin/policies')
  return { ok: true }
}

export async function listPoliciesForEmployee(userId: string) {
  const policies = await prisma.policy.findMany({
    where: { active: true },
    orderBy: [{ category: 'asc' }, { publishedAt: 'desc' }],
  })
  const acks = await prisma.policyAcknowledgement.findMany({
    where: { userId, policyId: { in: policies.map((p) => p.id) } },
  })
  const ackMap = new Map(acks.map((a) => [`${a.policyId}:${a.version}`, a]))

  return policies.map((p) => ({
    ...p,
    acknowledged: ackMap.has(`${p.id}:${p.version}`),
  }))
}

export async function listAllPolicies() {
  return prisma.policy.findMany({
    orderBy: [{ active: 'desc' }, { category: 'asc' }, { publishedAt: 'desc' }],
    include: { _count: { select: { acknowledgements: true } } },
  })
}

export async function getPolicy(id: string) {
  return prisma.policy.findUnique({ where: { id } })
}
