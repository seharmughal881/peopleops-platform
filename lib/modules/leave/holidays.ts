'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/db/client'
import { requirePermission } from '@/lib/modules/auth'
import { recordAudit } from '@/lib/modules/audit'

const AddHolidaySchema = z.object({
  date: z.coerce.date(),
  name: z.string().min(1).max(120),
  country: z.string().min(2).max(2).default('US'),
})

export async function addHoliday(formData: FormData) {
  const actor = await requirePermission('policy:*')
  const parsed = AddHolidaySchema.safeParse({
    date: formData.get('date'),
    name: formData.get('name'),
    country: (formData.get('country') as string) || 'US',
  })
  if (!parsed.success) return { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors }

  try {
    const row = await prisma.holiday.create({ data: parsed.data })
    await recordAudit({
      userId: actor.id,
      action: 'holiday.added',
      entityType: 'Holiday',
      entityId: row.id,
      after: parsed.data,
    })
  } catch (e: any) {
    if (e?.code === 'P2002') return { error: 'A holiday already exists on that date for that country' }
    throw e
  }

  revalidatePath('/admin/holidays')
  return { ok: true }
}

export async function deleteHoliday(formData: FormData) {
  const actor = await requirePermission('policy:*')
  const id = String(formData.get('id') || '')
  await prisma.holiday.delete({ where: { id } })
  await recordAudit({
    userId: actor.id,
    action: 'holiday.deleted',
    entityType: 'Holiday',
    entityId: id,
  })
  revalidatePath('/admin/holidays')
  return { ok: true }
}
