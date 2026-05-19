// Compliance & Security helpers — GDPR export/delete, policy management, doc expiration.
import { prisma } from '@/lib/db/client'

export { buildEmployeeExport, hardDeleteEmployee } from './gdpr'
export { deleteEmployeeGdpr } from './actions'

export async function documentsExpiringSoon(days = 30) {
  const cutoff = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
  return prisma.document.findMany({
    where: { expiresAt: { not: null, lte: cutoff } },
    include: { employee: { select: { firstName: true, lastName: true } } },
    orderBy: { expiresAt: 'asc' },
  })
}
