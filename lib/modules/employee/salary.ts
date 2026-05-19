'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/db/client'
import { requirePermission } from '@/lib/modules/auth'
import { recordAudit } from '@/lib/modules/audit'

const AddSalarySchema = z.object({
  employeeId: z.string().min(1),
  amount: z.coerce.number().positive(),
  currency: z.string().min(3).max(3).default('USD'),
  effectiveDate: z.coerce.date(),
  reason: z.string().optional(),
})

export async function addSalaryEntry(formData: FormData) {
  const actor = await requirePermission('employee:read')

  const parsed = AddSalarySchema.safeParse({
    employeeId: formData.get('employeeId'),
    amount: formData.get('amount'),
    currency: (formData.get('currency') as string) || 'USD',
    effectiveDate: formData.get('effectiveDate'),
    reason: formData.get('reason') || undefined,
  })
  if (!parsed.success) return { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors }

  const row = await prisma.salaryHistory.create({ data: parsed.data })

  await recordAudit({
    userId: actor.id,
    action: 'employee.salary.added',
    entityType: 'SalaryHistory',
    entityId: row.id,
    after: parsed.data,
  })

  revalidatePath(`/admin/employees/${parsed.data.employeeId}`)
  return { ok: true }
}

export async function listSalaryHistory(employeeId: string) {
  return prisma.salaryHistory.findMany({
    where: { employeeId },
    orderBy: { effectiveDate: 'desc' },
  })
}
