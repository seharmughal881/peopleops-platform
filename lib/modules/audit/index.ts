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
