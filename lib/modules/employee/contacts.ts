'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/client'
import { requireUser } from '@/lib/modules/auth'
import { recordAudit } from '@/lib/modules/audit'
import { ContactSchema, type EmergencyContact } from './contacts-schema'

export async function setMyEmergencyContacts(formData: FormData) {
  const user = await requireUser()
  if (!user.employee) return { error: 'No employee record' }

  const names = formData.getAll('name').map(String)
  const relations = formData.getAll('relation').map(String)
  const phones = formData.getAll('phone').map(String)

  const contacts: EmergencyContact[] = []
  for (let i = 0; i < names.length; i++) {
    const c = { name: names[i] ?? '', relation: relations[i] ?? '', phone: phones[i] ?? '' }
    if (!c.name && !c.relation && !c.phone) continue
    const parsed = ContactSchema.safeParse(c)
    if (!parsed.success) return { error: `Row ${i + 1}: ${parsed.error.issues[0]?.message ?? 'invalid'}` }
    contacts.push(parsed.data)
  }

  await prisma.employeeProfile.upsert({
    where: { employeeId: user.employee.id },
    update: { emergencyContacts: JSON.stringify(contacts) },
    create: { employeeId: user.employee.id, emergencyContacts: JSON.stringify(contacts) },
  })

  await recordAudit({
    userId: user.id,
    action: 'employee.emergencyContacts.updated',
    entityType: 'EmployeeProfile',
    entityId: user.employee.id,
    after: { count: contacts.length },
  })

  revalidatePath('/profile')
  return { ok: true, count: contacts.length }
}
