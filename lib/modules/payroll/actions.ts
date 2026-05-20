'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/db/client'
import { requirePermission } from '@/lib/modules/auth'
import { recordAudit } from '@/lib/modules/audit'
import { computePayslip } from './engine'

const CreatePayslipRunSchema = z
  .object({
    periodStart: z.coerce.date(),
    periodEnd: z.coerce.date(),
  })
  .refine((d) => d.periodEnd > d.periodStart, {
    message: 'periodEnd must be after periodStart',
    path: ['periodEnd'],
  })

export async function createPayslipRun(formData: FormData) {
  const actor = await requirePermission('payroll:create')

  const parsed = CreatePayslipRunSchema.safeParse({
    periodStart: formData.get('periodStart'),
    periodEnd: formData.get('periodEnd'),
  })
  if (!parsed.success) {
    return { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors }
  }
  const { periodStart, periodEnd } = parsed.data

  const run = await prisma.payslipRun.create({ data: { periodStart, periodEnd } })

  const employees = await prisma.employee.findMany({
    where: { status: 'active' },
    include: { salaryHistory: { orderBy: { effectiveDate: 'desc' }, take: 1 } },
  })

  for (const emp of employees) {
    const latest = emp.salaryHistory[0]
    const currency = latest?.currency ?? 'USD'
    const { grossPay, deductions, netPay } = computePayslip({
      monthlySalary: latest?.amount ?? 0,
      currency,
    })

    await prisma.payslip.create({
      data: {
        payslipRunId: run.id,
        employeeId: emp.id,
        grossPay,
        deductions: JSON.stringify(deductions),
        netPay,
        currency,
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
