'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/db/client'
import { requireUser, requirePermission } from '@/lib/modules/auth'
import { recordAudit } from '@/lib/modules/audit'
import { CreateSurveySchema, parseQuestions, SurveyAnswerSchema, type SurveyAnswer } from './schemas'

export async function createSurvey(formData: FormData) {
  const actor = await requirePermission('employee:read')
  if (!actor.employee) return { error: 'No employee record' }

  const labels = formData.getAll('qLabel').map(String)
  const kinds = formData.getAll('qKind').map(String)
  const optionsRaw = formData.getAll('qOptions').map(String)

  const questions = labels
    .map((label, i) => {
      const kind = kinds[i] as 'rating' | 'text' | 'choice' | undefined
      if (!label.trim() || !kind) return null
      const opts = optionsRaw[i]?.split(',').map((s) => s.trim()).filter(Boolean) ?? []
      return {
        id: `q${i + 1}`,
        kind,
        label: label.trim(),
        options: kind === 'choice' ? opts : undefined,
        required: true,
      }
    })
    .filter((q): q is NonNullable<typeof q> => q !== null)

  const parsed = CreateSurveySchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description') || undefined,
    anonymous: formData.get('anonymous') === 'on',
    questions,
  })
  if (!parsed.success) {
    return { error: parsed.error.flatten().formErrors[0] ?? 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const survey = await prisma.survey.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      anonymous: parsed.data.anonymous,
      questions: JSON.stringify(parsed.data.questions),
      createdById: actor.employee.id,
    },
  })

  await recordAudit({
    userId: actor.id,
    action: 'survey.created',
    entityType: 'Survey',
    entityId: survey.id,
    after: { title: survey.title, questions: parsed.data.questions.length },
  })

  revalidatePath('/admin/surveys')
  return { ok: true, surveyId: survey.id }
}

export async function setSurveyStatus(formData: FormData) {
  const actor = await requirePermission('employee:read')
  const id = String(formData.get('id') || '')
  const status = String(formData.get('status') || '')
  if (!['draft', 'active', 'closed'].includes(status)) return { error: 'Invalid status' }

  await prisma.survey.update({ where: { id }, data: { status } })
  await recordAudit({
    userId: actor.id,
    action: `survey.${status}`,
    entityType: 'Survey',
    entityId: id,
  })
  revalidatePath('/admin/surveys')
  revalidatePath('/surveys')
  return { ok: true }
}

export async function submitSurveyResponse(formData: FormData) {
  const user = await requireUser()
  if (!user.employee) return { error: 'No employee record' }

  const surveyId = String(formData.get('surveyId') || '')
  const survey = await prisma.survey.findUnique({ where: { id: surveyId } })
  if (!survey) return { error: 'Survey not found' }
  if (survey.status !== 'active') return { error: 'Survey is not active' }

  // Block double-submit if not anonymous
  if (!survey.anonymous) {
    const existing = await prisma.surveyResponse.findFirst({
      where: { surveyId, respondentId: user.employee.id },
    })
    if (existing) return { error: 'You have already responded' }
  }

  const questions = parseQuestions(survey.questions)
  const answers: SurveyAnswer[] = []
  for (const q of questions) {
    const raw = formData.get(q.id)
    if (raw == null && q.required) return { error: `Question "${q.label}" is required` }
    if (raw == null) continue
    const value = q.kind === 'rating' ? Number(raw) : String(raw)
    const valid = SurveyAnswerSchema.safeParse({ questionId: q.id, value })
    if (!valid.success) return { error: `Invalid answer for "${q.label}"` }
    answers.push(valid.data)
  }

  await prisma.surveyResponse.create({
    data: {
      surveyId,
      respondentId: survey.anonymous ? null : user.employee.id,
      answers: JSON.stringify(answers),
    },
  })

  await recordAudit({
    userId: user.id,
    action: 'survey.responded',
    entityType: 'Survey',
    entityId: surveyId,
    after: { anonymous: survey.anonymous, answers: answers.length },
  })

  revalidatePath('/surveys')
  return { ok: true }
}
