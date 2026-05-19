import 'server-only'
import { prisma } from '@/lib/db/client'

export type Selector = 'manager' | 'hr_admin' | 'finance' | 'super_admin'

type Op = 'gte' | 'lte' | 'gt' | 'lt' | 'eq' | 'in'

interface Condition {
  field?: string
  op?: Op
  value?: unknown
}

export interface RuleContext {
  // facts available to rules: amount/days/urgency/leaveType/category/...
  [key: string]: unknown
  employeeId?: string
}

function compare(actual: unknown, op: Op, expected: unknown): boolean {
  if (op === 'in') return Array.isArray(expected) && expected.includes(actual)
  const a = typeof actual === 'number' ? actual : Number(actual)
  const b = typeof expected === 'number' ? expected : Number(expected)
  switch (op) {
    case 'eq': return actual === expected || a === b
    case 'gte': return a >= b
    case 'lte': return a <= b
    case 'gt': return a > b
    case 'lt': return a < b
  }
}

function matches(condition: Condition, ctx: RuleContext): boolean {
  if (!condition.field || !condition.op) return true // empty condition = always match
  const actual = ctx[condition.field]
  return compare(actual, condition.op, condition.value)
}

async function resolveSelector(selector: Selector, ctx: RuleContext): Promise<string | null> {
  if (selector === 'manager') {
    if (!ctx.employeeId) return null
    const emp = await prisma.employee.findUnique({
      where: { id: String(ctx.employeeId) },
      include: { manager: { select: { userId: true } } },
    })
    return emp?.manager?.userId ?? null
  }
  const role = await prisma.role.findUnique({ where: { name: selector } })
  if (!role) return null
  const first = await prisma.userRole.findFirst({ where: { roleId: role.id }, select: { userId: true } })
  return first?.userId ?? null
}

/**
 * Returns ordered approver userIds for the given entityType + context.
 * If no rule matches, returns null so callers can fall back to legacy logic.
 */
export async function resolveApprovers(entityType: string, ctx: RuleContext): Promise<string[] | null> {
  const rules = await prisma.approvalRule.findMany({
    where: { entityType, active: true },
    orderBy: { priority: 'asc' },
  })

  for (const rule of rules) {
    let condition: Condition = {}
    try { condition = JSON.parse(rule.condition) } catch { continue }
    if (!matches(condition, ctx)) continue

    let chain: Selector[] = []
    try { chain = JSON.parse(rule.approverChain) } catch { continue }

    const ids: string[] = []
    const seen = new Set<string>()
    for (const sel of chain) {
      const userId = await resolveSelector(sel, ctx)
      if (userId && !seen.has(userId)) {
        ids.push(userId)
        seen.add(userId)
      }
    }
    if (ids.length > 0) return ids
  }

  return null
}
