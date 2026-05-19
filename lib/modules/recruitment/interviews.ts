'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/client'
import { requireUser, requirePermission } from '@/lib/modules/auth'
import { recordAudit } from '@/lib/modules/audit'
import { notify } from '@/lib/modules/notifications'
import { ScheduleInterviewSchema, LogFeedbackSchema } from './schemas'

export async function scheduleInterview(formData: FormData) {
  const actor = await requirePermission('employee:read')

  const parsed = ScheduleInterviewSchema.safeParse({
    candidateId: formData.get('candidateId'),
    interviewerId: formData.get('interviewerId'),
    scheduledAt: formData.get('scheduledAt'),
    type: formData.get('type') || 'phone',
  })
  if (!parsed.success) {
    return { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const interview = await prisma.interview.create({ data: parsed.data })

  const interviewer = await prisma.employee.findUnique({
    where: { id: parsed.data.interviewerId },
    select: { user: { select: { id: true } } },
  })
  const candidate = await prisma.candidate.findUnique({
    where: { id: parsed.data.candidateId },
    select: { firstName: true, lastName: true },
  })
  if (interviewer?.user && candidate) {
    await notify({
      userId: interviewer.user.id,
      title: `Interview scheduled: ${candidate.firstName} ${candidate.lastName}`,
      body: `${parsed.data.type} on ${parsed.data.scheduledAt.toLocaleString()}`,
      link: `/admin/recruitment/candidates/${parsed.data.candidateId}`,
    })
  }

  // Auto-advance candidate to 'interview' stage if still earlier
  await prisma.candidate.update({
    where: {
      id: parsed.data.candidateId,
    },
    data: {
      stage: 'interview',
    },
  })

  await recordAudit({
    userId: actor.id,
    action: 'interview.scheduled',
    entityType: 'Interview',
    entityId: interview.id,
    after: parsed.data,
  })

  revalidatePath(`/admin/recruitment/candidates/${parsed.data.candidateId}`)
  return { ok: true }
}

export async function logInterviewFeedback(formData: FormData) {
  const user = await requireUser()
  if (!user.employee) return { error: 'No employee record' }

  const parsed = LogFeedbackSchema.safeParse({
    id: formData.get('id'),
    rating: formData.get('rating'),
    feedback: formData.get('feedback') || undefined,
    recommendation: formData.get('recommendation'),
  })
  if (!parsed.success) return { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors }

  const interview = await prisma.interview.findUnique({ where: { id: parsed.data.id } })
  if (!interview) return { error: 'Not found' }
  if (interview.interviewerId !== user.employee.id && !user.permissions.includes('*')) {
    return { error: 'Forbidden' }
  }

  await prisma.interview.update({
    where: { id: interview.id },
    data: {
      rating: parsed.data.rating,
      feedback: parsed.data.feedback,
      recommendation: parsed.data.recommendation,
      status: 'completed',
    },
  })

  await recordAudit({
    userId: user.id,
    action: 'interview.feedback',
    entityType: 'Interview',
    entityId: interview.id,
    after: { rating: parsed.data.rating, recommendation: parsed.data.recommendation },
  })

  revalidatePath(`/admin/recruitment/candidates/${interview.candidateId}`)
  return { ok: true }
}
