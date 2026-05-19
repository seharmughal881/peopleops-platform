import { z } from 'zod'

export const RECOG_CATEGORIES = ['kudos', 'thanks', 'achievement', 'teamwork'] as const
export const RSVP_STATUSES = ['going', 'maybe', 'notGoing'] as const
export const QUESTION_KINDS = ['rating', 'text', 'choice'] as const

export const GiveRecognitionSchema = z.object({
  toEmployeeId: z.string().min(1),
  category: z.enum(RECOG_CATEGORIES).default('kudos'),
  message: z.string().min(1).max(2000),
  visibility: z.enum(['public', 'team']).default('public'),
})

export const CreateEventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(4000).optional(),
  location: z.string().max(200).optional(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date().optional(),
  capacity: z.coerce.number().int().positive().optional(),
})

export const RSVPSchema = z.object({
  eventId: z.string().min(1),
  status: z.enum(RSVP_STATUSES),
})

const QuestionSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(QUESTION_KINDS),
  label: z.string().min(1),
  options: z.array(z.string()).optional(),
  required: z.boolean().optional(),
})
export type SurveyQuestion = z.infer<typeof QuestionSchema>

export const CreateSurveySchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  anonymous: z.coerce.boolean().default(false),
  questions: z.array(QuestionSchema).min(1, 'Add at least one question'),
})

export const SurveyAnswerSchema = z.object({
  questionId: z.string().min(1),
  value: z.union([z.string(), z.number()]),
})
export type SurveyAnswer = z.infer<typeof SurveyAnswerSchema>

export function parseQuestions(raw: string): SurveyQuestion[] {
  try {
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr.filter((q): q is SurveyQuestion => QuestionSchema.safeParse(q).success)
  } catch {
    return []
  }
}

export function parseAnswers(raw: string): SurveyAnswer[] {
  try {
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr.filter((a): a is SurveyAnswer => SurveyAnswerSchema.safeParse(a).success)
  } catch {
    return []
  }
}
