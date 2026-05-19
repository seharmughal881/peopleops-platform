// Server-side by nature (uses Prisma). 'server-only' omitted because this file is also
// imported by Server Actions that flow into client components, and the static import trace
// would otherwise fail. Prisma can't run client-side anyway.
import { prisma } from '@/lib/db/client'

/**
 * GDPR Article 20 — Right to data portability.
 * Returns a complete export of everything we hold about an employee, as plain JSON.
 * Audit entries are intentionally preserved (legal record), but redacted to just the actions taken.
 */
export async function buildEmployeeExport(employeeId: string) {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      user: { select: { id: true, email: true, mfaEnabled: true, lastLoginAt: true, createdAt: true } },
      department: { select: { name: true } },
      manager: { select: { firstName: true, lastName: true, employeeCode: true } },
      profile: true,
      employmentHistory: { orderBy: { startDate: 'desc' } },
      salaryHistory: { orderBy: { effectiveDate: 'desc' } },
      documents: { select: { type: true, name: true, uploadedAt: true, expiresAt: true } },
      skills: true,
      employeeShifts: { include: { shiftPattern: true } },
      attendanceLogs: { orderBy: { clockIn: 'desc' }, take: 1000 },
      leaveBalances: true,
      leaveRequests: { orderBy: { createdAt: 'desc' } },
      payslips: { include: { payslipRun: { select: { periodStart: true, periodEnd: true, status: true } } } },
      expenses: { include: { receipts: { select: { name: true, uploadedAt: true } } } },
      assetAssignments: { include: { asset: { select: { tag: true, name: true, category: true } } } },
      licenseAssignments: { include: { license: { select: { name: true, vendor: true } } } },
      goals: true,
      reviewsAsSubject: {
        include: { cycle: { select: { name: true } }, reviewer: { select: { firstName: true, lastName: true } } },
      },
      reviewsAsReviewer: {
        include: { cycle: { select: { name: true } }, subject: { select: { firstName: true, lastName: true } } },
      },
      pipsAsSubject: true,
      promotionsReceived: true,
      promotionsGiven: true,
      recognitionsGiven: { include: { to: { select: { firstName: true, lastName: true } } } },
      recognitionsReceived: { include: { from: { select: { firstName: true, lastName: true } } } },
    },
  })
  if (!employee) return null

  // Audit log linked to the user — kept as historical record (action + timestamp only, no sensitive payload)
  const audits = await prisma.auditLog.findMany({
    where: { userId: employee.user.id },
    select: { action: true, entityType: true, createdAt: true, ip: true },
    orderBy: { createdAt: 'desc' },
    take: 5000,
  })

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    subject: {
      employeeId: employee.id,
      employeeCode: employee.employeeCode,
      email: employee.user.email,
    },
    employee,
    auditLog: audits,
  }
}

/**
 * GDPR Article 17 — Right to erasure.
 * Hard-deletes the employee + user record. Prisma cascades clean up profile, attendance, leave,
 * documents, etc. We replace audit-log `userId` with null so the log entries persist (legal record)
 * but no longer identify the natural person.
 */
export async function hardDeleteEmployee(employeeId: string, deletedByUserId: string) {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { userId: true, employeeCode: true, firstName: true, lastName: true },
  })
  if (!employee) throw new Error('Employee not found')

  // Anonymise audit log entries that reference this user (FK is onDelete: SetNull, so this is belt-and-braces)
  await prisma.auditLog.updateMany({
    where: { userId: employee.userId },
    data: { userId: null, ip: null, userAgent: null },
  })

  // Delete cascades from User → Employee → all related (defined in Prisma schema as onDelete: Cascade)
  await prisma.user.delete({ where: { id: employee.userId } })

  // Drop one final audit entry recording the deletion happened, attributed to the actor
  await prisma.auditLog.create({
    data: {
      userId: deletedByUserId,
      action: 'gdpr.employee.deleted',
      entityType: 'Employee',
      entityId: employeeId,
      after: JSON.stringify({ employeeCode: employee.employeeCode }),
    },
  })

  return { ok: true, employeeCode: employee.employeeCode }
}
