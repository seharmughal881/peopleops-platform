import { requireUser } from '@/lib/modules/auth'
import { prisma } from '@/lib/db/client'
import { renderPayslipPdf } from '@/lib/modules/payroll/payslip-pdf'
import { recordAudit } from '@/lib/modules/audit'
import { pdfResponse } from '@/lib/export'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser()
  const { id } = await ctx.params

  const slip = await prisma.payslip.findUnique({
    where: { id },
    include: {
      payslipRun: true,
      employee: {
        include: { department: { select: { name: true } } },
      },
    },
  })

  if (!slip) return new NextResponse('Payslip not found', { status: 404 })

  // Only the employee themselves or an admin/HR can download
  const isOwner = user.employee?.id === slip.employeeId
  const isAdmin = user.permissions.includes('payroll:*') || user.roles.includes('hr_admin') || user.roles.includes('super_admin')
  if (!isOwner && !isAdmin) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  const buf = await renderPayslipPdf({
    payslip: {
      id: slip.id,
      grossPay: slip.grossPay,
      netPay: slip.netPay,
      deductions: slip.deductions,
      currency: slip.currency,
      createdAt: slip.createdAt,
    },
    run: {
      periodStart: slip.payslipRun.periodStart,
      periodEnd: slip.payslipRun.periodEnd,
      status: slip.payslipRun.status,
    },
    employee: {
      employeeCode: slip.employee.employeeCode,
      firstName: slip.employee.firstName,
      lastName: slip.employee.lastName,
      jobTitle: slip.employee.jobTitle,
      department: slip.employee.department,
    },
  })

  await recordAudit({
    userId: user.id,
    action: 'payslip.download.pdf',
    entityType: 'Payslip',
    entityId: slip.id,
  })

  const period = slip.payslipRun.periodStart.toISOString().slice(0, 7)
  const filename = `payslip_${slip.employee.employeeCode}_${period}.pdf`
  return pdfResponse(buf, filename)
}
