import { prisma } from '@/lib/db/client'
import { parseAnswers, parseQuestions, type SurveyAnswer } from './schemas'

export async function recognitionFeed(limit = 30) {
  return prisma.recognition.findMany({
    where: { visibility: 'public' },
    include: {
      from: { select: { firstName: true, lastName: true, employeeCode: true } },
      to: { select: { firstName: true, lastName: true, employeeCode: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

export async function recognitionFor(employeeId: string) {
  return prisma.recognition.findMany({
    where: { toEmployeeId: employeeId },
    include: { from: { select: { firstName: true, lastName: true } } },
    orderBy: { createdAt: 'desc' },
  })
}

export async function upcomingEvents() {
  return prisma.event.findMany({
    where: { startsAt: { gte: new Date() } },
    include: {
      rsvps: { select: { status: true, employeeId: true } },
      createdBy: { select: { firstName: true, lastName: true } },
    },
    orderBy: { startsAt: 'asc' },
  })
}

export async function pastEvents() {
  return prisma.event.findMany({
    where: { startsAt: { lt: new Date() } },
    include: { rsvps: { select: { status: true } } },
    orderBy: { startsAt: 'desc' },
    take: 30,
  })
}

export async function getEvent(id: string) {
  return prisma.event.findUnique({
    where: { id },
    include: {
      createdBy: { select: { firstName: true, lastName: true } },
      rsvps: {
        include: { employee: { select: { firstName: true, lastName: true, employeeCode: true } } },
      },
    },
  })
}

export async function listSurveysFor(employeeId: string) {
  // Active surveys
  const active = await prisma.survey.findMany({
    where: { status: 'active' },
    orderBy: { createdAt: 'desc' },
  })

  // Surveys this user already responded to (only checkable when not anonymous)
  const respondedIds = await prisma.surveyResponse.findMany({
    where: { respondentId: employeeId },
    select: { surveyId: true },
  })
  const respondedSet = new Set(respondedIds.map((r) => r.surveyId))

  return active.map((s) => ({ ...s, alreadyResponded: !s.anonymous && respondedSet.has(s.id) }))
}

export async function getSurvey(id: string) {
  const s = await prisma.survey.findUnique({ where: { id } })
  if (!s) return null
  return { ...s, parsedQuestions: parseQuestions(s.questions) }
}

export async function listAllSurveys() {
  return prisma.survey.findMany({
    include: { _count: { select: { responses: true } } },
    orderBy: { createdAt: 'desc' },
  })
}

export async function surveyResults(id: string) {
  const survey = await getSurvey(id)
  if (!survey) return null
  const responses = await prisma.surveyResponse.findMany({
    where: { surveyId: id },
    select: { answers: true, respondentId: true, submittedAt: true },
  })
  const parsed = responses.map((r) => ({ ...r, parsedAnswers: parseAnswers(r.answers) }))

  const byQuestion = new Map<string, { question: typeof survey.parsedQuestions[number]; values: SurveyAnswer['value'][] }>()
  for (const q of survey.parsedQuestions) byQuestion.set(q.id, { question: q, values: [] })

  for (const r of parsed) {
    for (const a of r.parsedAnswers) {
      const bucket = byQuestion.get(a.questionId)
      if (bucket) bucket.values.push(a.value)
    }
  }

  return { survey, responses: parsed, byQuestion: Array.from(byQuestion.values()) }
}
