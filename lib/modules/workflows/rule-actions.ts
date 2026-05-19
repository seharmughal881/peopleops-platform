'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/db/client'
import { requirePermission } from '@/lib/modules/auth'
import { recordAudit } from '@/lib/modules/audit'

const SELECTORS = ['manager', 'hr_admin', 'finance', 'super_admin'] as const
const OPS = ['gte', 'lte', 'gt', 'lt', 'eq', 'in'] as const
const ENTITY_TYPES = ['LeaveRequest', 'Expense', 'HiringRequest'] as const

const RuleSchema = z.object({
  name: z.string().min(1).max(160),
  entityType: z.enum(ENTITY_TYPES),
  priority: z.coerce.number().int().default(100),
  field: z.string().optional().or(z.literal('').transform(() => undefined)),
  op: z.enum(OPS).optional().or(z.literal('').transform(() => undefined)),
  value: z.string().optional(),
  approverChain: z.string().min(1), // CSV of selectors
  active: z.coerce.boolean().default(true),
})

function buildCondition(input: z.infer<typeof RuleSchema>): string {
  if (!input.field || !input.op) return '{}'
  let value: unknown = input.value
  if (value != null && /^-?\d+(\.\d+)?$/.test(String(value))) value = Number(value)
  if (input.op === 'in' && typeof value === 'string') {
    value = value.split(',').map((s) => s.trim()).filter(Boolean)
  }
  return JSON.stringify({ field: input.field, op: input.op, value })
}

function buildChain(input: z.infer<typeof RuleSchema>): string {
  const parts = input.approverChain.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean)
  for (const p of parts) {
    if (!SELECTORS.includes(p as typeof SELECTORS[number])) {
      throw new Error(`Invalid selector "${p}". Use: ${SELECTORS.join(', ')}`)
    }
  }
  return JSON.stringify(parts)
}

export async function createApprovalRule(formData: FormData) {
  const actor = await requirePermission('employee:read')
  const parsed = RuleSchema.safeParse({
    name: formData.get('name'),
    entityType: formData.get('entityType'),
    priority: formData.get('priority') || 100,
    field: formData.get('field') || undefined,
    op: formData.get('op') || undefined,
    value: formData.get('value') || undefined,
    approverChain: formData.get('approverChain') || '',
    active: formData.get('active') === 'on' || formData.get('active') === 'true',
  })
  if (!parsed.success) return { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors }

  let condition: string, approverChain: string
  try {
    condition = buildCondition(parsed.data)
    approverChain = buildChain(parsed.data)
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Invalid input' }
  }

  const rule = await prisma.approvalRule.create({
    data: {
      name: parsed.data.name,
      entityType: parsed.data.entityType,
      priority: parsed.data.priority,
      condition,
      approverChain,
      active: parsed.data.active,
    },
  })
  await recordAudit({
    userId: actor.id,
    action: 'workflow.rule.created',
    entityType: 'ApprovalRule',
    entityId: rule.id,
    after: { name: rule.name, entityType: rule.entityType, condition, approverChain },
  })
  revalidatePath('/admin/workflows')
  return { ok: true }
}

export async function toggleApprovalRule(formData: FormData) {
  const actor = await requirePermission('employee:read')
  const id = String(formData.get('id') || '')
  const rule = await prisma.approvalRule.findUnique({ where: { id } })
  if (!rule) return { error: 'Not found' }
  await prisma.approvalRule.update({ where: { id }, data: { active: !rule.active } })
  await recordAudit({
    userId: actor.id,
    action: rule.active ? 'workflow.rule.disabled' : 'workflow.rule.enabled',
    entityType: 'ApprovalRule',
    entityId: id,
  })
  revalidatePath('/admin/workflows')
  return { ok: true }
}

export async function deleteApprovalRule(formData: FormData) {
  const actor = await requirePermission('employee:read')
  const id = String(formData.get('id') || '')
  await prisma.approvalRule.delete({ where: { id } })
  await recordAudit({
    userId: actor.id,
    action: 'workflow.rule.deleted',
    entityType: 'ApprovalRule',
    entityId: id,
  })
  revalidatePath('/admin/workflows')
  return { ok: true }
}
