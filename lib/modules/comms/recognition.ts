'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/client'
import { requireUser } from '@/lib/modules/auth'
import { recordAudit } from '@/lib/modules/audit'
import { notify } from '@/lib/modules/notifications'
import { GiveRecognitionSchema } from './schemas'

export async function giveRecognition(formData: FormData) {
  const user = await requireUser()
  if (!user.employee) return { error: 'No employee record' }

  const parsed = GiveRecognitionSchema.safeParse({
    toEmployeeId: formData.get('toEmployeeId'),
    category: formData.get('category') || 'kudos',
    message: formData.get('message'),
    visibility: formData.get('visibility') || 'public',
  })
  if (!parsed.success) return { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors }
  if (parsed.data.toEmployeeId === user.employee.id) return { error: 'You can’t recognize yourself' }

  const rec = await prisma.recognition.create({
    data: { ...parsed.data, fromEmployeeId: user.employee.id },
    include: { to: { include: { user: true } } },
  })

  await notify({
    userId: rec.to.user.id,
    title: `${user.employee.firstName} recognized you (${parsed.data.category})`,
    body: parsed.data.message,
    link: '/recognition',
  })

  await recordAudit({
    userId: user.id,
    action: 'recognition.given',
    entityType: 'Recognition',
    entityId: rec.id,
    after: { toEmployeeId: rec.toEmployeeId, category: rec.category },
  })

  revalidatePath('/recognition')
  return { ok: true }
}
