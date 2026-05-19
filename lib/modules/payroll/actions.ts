'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/client'
import { requirePermission } from '@/lib/modules/auth'
import { recordAudit } from '@/lib/modules/audit'

export async function createPayslipRun(formData: FormData) {
  const actor = await requirePermission('payroll:create')

  const periodStart = new Date(String(formData.get('periodStart')))
  const periodEnd = new Date(String(formData.get('periodEnd')))

  const run = await prisma.payslipRun.create({ data: { periodStart, periodEnd } })

  const employees = await prisma.employee.findMany({
    where: { status: 'active' },
    include: { salaryHistory: { orderBy: { effectiveDate: 'desc' }, take: 1 } },
  })

  for (const emp of employees) {
    const monthly = emp.salaryHistory[0]?.amount ?? 0
    const tax = Math.round(monthly * 0.2 * 100) / 100
    const deductions = JSON.stringify([{ label: 'Tax', amount: tax }])
    const netPay = Math.round((monthly - tax) * 100) / 100

    await prisma.payslip.create({
      data: {
        payslipRunId: run.id,
        employeeId: emp.id,
        grossPay: monthly,
        deductions,
        netPay,
      },
    })
  }

  await recordAudit({
    userId: actor.id,
    action: 'payroll.run.created',
    entityType: 'PayslipRun',
    entityId: run.id,
  })

  revalidatePath('/admin/payroll')
  return { ok: true, runId: run.id }
}
