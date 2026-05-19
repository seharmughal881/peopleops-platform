import { z } from 'zod'

export const EMPLOYMENT_TYPES = ['fullTime', 'partTime', 'contract', 'intern'] as const
export const JOB_STATUSES = ['draft', 'open', 'closed', 'filled'] as const
export const CANDIDATE_STAGES = ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected'] as const
export const INTERVIEW_TYPES = ['phone', 'onsite', 'technical', 'cultural', 'panel'] as const
export const OFFER_STATUSES = ['draft', 'sent', 'accepted', 'declined', 'withdrawn'] as const

export const CreateJobSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(8000),
  departmentId: z.string().optional(),
  location: z.string().optional(),
  employmentType: z.enum(EMPLOYMENT_TYPES).default('fullTime'),
  salaryMin: z.coerce.number().nonnegative().optional(),
  salaryMax: z.coerce.number().nonnegative().optional(),
  currency: z.string().min(3).max(3).default('USD'),
})

export const AddCandidateSchema = z.object({
  jobPostingId: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().trim().toLowerCase(),
  phone: z.string().optional(),
  source: z.enum(['linkedIn', 'referral', 'direct', 'other']).default('direct'),
  notes: z.string().optional(),
})

export const ScheduleInterviewSchema = z.object({
  candidateId: z.string().min(1),
  interviewerId: z.string().min(1),
  scheduledAt: z.coerce.date(),
  type: z.enum(INTERVIEW_TYPES).default('phone'),
})

export const LogFeedbackSchema = z.object({
  id: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  feedback: z.string().max(4000).optional(),
  recommendation: z.enum(['hire', 'no_hire', 'maybe']),
})

export const CreateOfferSchema = z.object({
  candidateId: z.string().min(1),
  salary: z.coerce.number().positive(),
  currency: z.string().min(3).max(3).default('USD'),
  startDate: z.coerce.date(),
  notes: z.string().optional(),
})

const RESUME_MAX = 10 * 1024 * 1024
const RESUME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

export function validateResume(file: File): { ok: true } | { ok: false; error: string } {
  if (file.size === 0) return { ok: false, error: 'Empty file' }
  if (file.size > RESUME_MAX) return { ok: false, error: 'Resume exceeds 10MB' }
  if (file.type && !RESUME_TYPES.has(file.type)) {
    return { ok: false, error: `Unsupported resume type: ${file.type}` }
  }
  return { ok: true }
}
