'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/client'
import { requireUser, requirePermission } from '@/lib/modules/auth'
import { recordAudit } from '@/lib/modules/audit'
import { CreateEventSchema, RSVPSchema } from './schemas'

export async function createEvent(formData: FormData) {
  const actor = await requirePermission('employee:read')
  if (!actor.employee) return { error: 'No employee record' }

  const parsed = CreateEventSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description') || undefined,
    location: formData.get('location') || undefined,
    startsAt: formData.get('startsAt'),
    endsAt: formData.get('endsAt') || undefined,
    capacity: formData.get('capacity') || undefined,
  })
  if (!parsed.success) return { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors }

  const event = await prisma.event.create({
    data: { ...parsed.data, createdById: actor.employee.id },
  })
  await recordAudit({
    userId: actor.id,
    action: 'event.created',
    entityType: 'Event',
    entityId: event.id,
    after: { title: event.title },
  })

  revalidatePath('/events')
  revalidatePath('/admin/events')
  return { ok: true, eventId: event.id }
}

export async function rsvp(formData: FormData) {
  const user = await requireUser()
  if (!user.employee) return { error: 'No employee record' }

  const parsed = RSVPSchema.safeParse({
    eventId: formData.get('eventId'),
    status: formData.get('status'),
  })
  if (!parsed.success) return { error: 'Validation failed' }

  // Check capacity if going
  if (parsed.data.status === 'going') {
    const event = await prisma.event.findUnique({
      where: { id: parsed.data.eventId },
      include: { rsvps: { where: { status: 'going' } } },
    })
    if (!event) return { error: 'Event not found' }
    const alreadyGoing = event.rsvps.find((r) => r.employeeId === user.employee!.id)
    if (event.capacity && !alreadyGoing && event.rsvps.length >= event.capacity) {
      return { error: 'Event is full' }
    }
  }

  await prisma.eventRSVP.upsert({
    where: { eventId_employeeId: { eventId: parsed.data.eventId, employeeId: user.employee.id } },
    update: { status: parsed.data.status, respondedAt: new Date() },
    create: { eventId: parsed.data.eventId, employeeId: user.employee.id, status: parsed.data.status },
  })

  await recordAudit({
    userId: user.id,
    action: 'event.rsvp',
    entityType: 'Event',
    entityId: parsed.data.eventId,
    after: { status: parsed.data.status },
  })

  revalidatePath('/events')
  return { ok: true }
}
