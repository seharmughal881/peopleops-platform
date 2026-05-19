'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/client'
import { requireUser } from '@/lib/modules/auth'
import { recordAudit } from '@/lib/modules/audit'
import { DiversitySchema } from './schemas'

export async function updateMyDiversity(formData: FormData) {
  const user = await requireUser()
  if (!user.employee) return { error: 'No employee record' }

  const parsed = DiversitySchema.safeParse({
    gender: formData.get('gender') ?? '',
    pronouns: formData.get('pronouns') ?? '',
    ethnicity: formData.get('ethnicity') ?? '',
    veteranStatus: formData.get('veteranStatus') ?? '',
    disabilityStatus: formData.get('disabilityStatus') ?? '',
  })
  if (!parsed.success) {
    return { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const data = parsed.data
  const employeeId = user.employee.id

  await prisma.employeeDiversity.upsert({
    where: { employeeId },
    create: { employeeId, ...data },
    update: data,
  })

  // Audit records WHO updated WHAT (without storing the actual diversity values,
  // since this is sensitive self-disclosed data).
  await recordAudit({
    userId: user.id,
    action: 'diversity.self.updated',
    entityType: 'EmployeeDiversity',
    entityId: employeeId,
    after: { fields: Object.keys(data).filter((k) => (data as Record<string, unknown>)[k] != null) },
  })

  revalidatePath('/profile')
  return { ok: true }
}

export async function clearMyDiversity() {
  const user = await requireUser()
  if (!user.employee) return { error: 'No employee record' }
  await prisma.employeeDiversity.deleteMany({ where: { employeeId: user.employee.id } })
  await recordAudit({
    userId: user.id,
    action: 'diversity.self.cleared',
    entityType: 'EmployeeDiversity',
    entityId: user.employee.id,
  })
  revalidatePath('/profile')
  return { ok: true }
}
