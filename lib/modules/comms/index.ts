// Internal Communication — announcements, recognition, events, surveys.
import { prisma } from '@/lib/db/client'

export { createAnnouncement, deleteAnnouncement } from './actions'
export { giveRecognition } from './recognition'
export { createEvent, rsvp } from './events'
export { createSurvey, setSurveyStatus, submitSurveyResponse } from './surveys'
export {
  recognitionFeed, recognitionFor, upcomingEvents, pastEvents, getEvent,
  listSurveysFor, getSurvey, listAllSurveys, surveyResults,
} from './queries'
export {
  RECOG_CATEGORIES, RSVP_STATUSES, QUESTION_KINDS,
  parseQuestions, parseAnswers, type SurveyQuestion, type SurveyAnswer,
} from './schemas'

export async function latestAnnouncements(limit = 5) {
  return prisma.announcement.findMany({
    orderBy: { publishedAt: 'desc' },
    take: limit,
  })
}

export async function listAnnouncements(limit = 50) {
  return prisma.announcement.findMany({
    orderBy: { publishedAt: 'desc' },
    take: limit,
  })
}
