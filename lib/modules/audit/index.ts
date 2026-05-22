import 'server-only'
import { prisma } from '@/lib/db/client'

export interface AuditEntry {
  userId?: string | null
  action: string
  entityType?: string
  entityId?: string
  before?: unknown
  after?: unknown
  ip?: string
  userAgent?: string
}

export async function recordAudit(entry: AuditEntry) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: entry.userId ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        before: entry.before === undefined ? null : JSON.stringify(entry.before),
        after: entry.after === undefined ? null : JSON.stringify(entry.after),
        ip: entry.ip,
        userAgent: entry.userAgent,
      },
    })
  } catch (err) {
    console.error('Audit log write failed', err)
  }
}

export async function listAuditLogs(opts: { limit?: number; entityType?: string; userId?: string } = {}) {
  return prisma.auditLog.findMany({
    where: {
      entityType: opts.entityType,
      userId: opts.userId,
    },
    include: { user: { select: { email: true } } },
    orderBy: { createdAt: 'desc' },
    take: opts.limit ?? 100,
  })
}

export interface ListAuditLogsPagedOpts {
  q?: string
  action?: string
  entityType?: string
  userId?: string
  from?: Date
  to?: Date
  sort?: 'createdAt' | 'action' | 'entityType'
  order?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

export async function listAuditLogsPaged(opts: ListAuditLogsPagedOpts = {}) {
  const page = Math.max(1, opts.page ?? 1)
  const pageSize = Math.max(1, Math.min(200, opts.pageSize ?? 25))
  const skip = (page - 1) * pageSize

  const createdAt = (() => {
    if (!opts.from && !opts.to) return undefined
    return {
      ...(opts.from ? { gte: opts.from } : {}),
      ...(opts.to ? { lte: opts.to } : {}),
    }
  })()

  const where = {
    ...(opts.userId ? { userId: opts.userId } : {}),
    ...(opts.action ? { action: opts.action } : {}),
    ...(opts.entityType ? { entityType: opts.entityType } : {}),
    ...(createdAt ? { createdAt } : {}),
    ...(opts.q
      ? {
          OR: [
            { action: { contains: opts.q, mode: 'insensitive' as const } },
            { entityType: { contains: opts.q, mode: 'insensitive' as const } },
            { entityId: { contains: opts.q, mode: 'insensitive' as const } },
            { user: { is: { email: { contains: opts.q, mode: 'insensitive' as const } } } },
          ],
        }
      : {}),
  }

  const sortField = opts.sort ?? 'createdAt'
  const order = opts.order ?? 'desc'

  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { email: true } } },
      orderBy: { [sortField]: order },
      skip,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ])

  return { rows, total, page, pageSize }
}

export async function listDistinctAuditEntityTypes(): Promise<string[]> {
  const rows = await prisma.auditLog.findMany({
    where: { entityType: { not: null } },
    distinct: ['entityType'],
    select: { entityType: true },
    orderBy: { entityType: 'asc' },
    take: 100,
  })
  return rows.map((r) => r.entityType!).filter(Boolean)
}

export async function listDistinctAuditActions(): Promise<string[]> {
  const rows = await prisma.auditLog.findMany({
    distinct: ['action'],
    select: { action: true },
    orderBy: { action: 'asc' },
    take: 200,
  })
  return rows.map((r) => r.action)
}
