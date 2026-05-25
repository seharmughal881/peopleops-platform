// Compliance & Security helpers — GDPR export/delete, policy management, doc expiration.
//
// ⚠️ Client components must NOT import this barrel — it pulls in prisma + env
// which then leaks into the client bundle and breaks env validation in the
// browser (DATABASE_URL is undefined). Import directly from the sub-file
// instead, e.g. `import { deleteEmployeeGdpr } from '@/lib/modules/compliance/actions'`.
import { prisma } from '@/lib/db/client'

export { buildEmployeeExport, hardDeleteEmployee } from './gdpr'
// NOTE: `deleteEmployeeGdpr` is intentionally NOT re-exported here.
// It lives in ./actions which imports server-only modules (auth, audit),
// and the BullMQ worker imports this barrel for `documentsExpiringSoon`.
// Import it directly: `from '@/lib/modules/compliance/actions'`.

export async function documentsExpiringSoon(days = 30) {
  const cutoff = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
  return prisma.document.findMany({
    where: { expiresAt: { not: null, lte: cutoff } },
    include: { employee: { select: { firstName: true, lastName: true } } },
    orderBy: { expiresAt: 'asc' },
  })
}
