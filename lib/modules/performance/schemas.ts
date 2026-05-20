import { z } from 'zod'

export const GOAL_TYPES = ['objective', 'keyResult', 'personal'] as const
export const GOAL_STATUSES = ['active', 'completed', 'cancelled'] as const
export const REVIEW_TYPES = ['self', 'manager', 'peer', 'upward'] as const

export const CreateGoalSchema = z.object({
  employeeId: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  type: z.enum(GOAL_TYPES).default('objective'),
  targetDate: z.coerce.date().optional(),
  parentId: z.string().optional(),
})

export const UpdateProgressSchema = z.object({
  id: z.string().min(1),
  progress: z.coerce.number().int().min(0).max(100),
  status: z.enum(GOAL_STATUSES).optional(),
})

export const CreateCycleSchema = z.object({
  name: z.string().min(1).max(120),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
}).refine((v) => v.endDate >= v.startDate, { message: 'endDate must be after startDate', path: ['endDate'] })

export const InitiateReviewSchema = z.object({
  cycleId: z.string().min(1),
  subjectId: z.string().min(1),
  reviewerId: z.string().min(1),
  type: z.enum(REVIEW_TYPES),
})

export const Initiate360Schema = z.object({
  cycleId: z.string().min(1),
  subjectId: z.string().min(1),
  peerIds: z.array(z.string().min(1)).max(20).default([]),
  upwardReviewerIds: z.array(z.string().min(1)).max(20).default([]),
  includeSelf: z.coerce.boolean().default(true),
  includeManager: z.coerce.boolean().default(true),
}).refine(
  (v) =>
    v.includeSelf || v.includeManager || v.peerIds.length > 0 || v.upwardReviewerIds.length > 0,
  { message: 'A 360 review must include at least one reviewer' },
)

export const SubmitReviewSchema = z.object({
  id: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  strengths: z.string().max(4000).optional(),
  growthAreas: z.string().max(4000).optional(),
  comments: z.string().max(4000).optional(),
})

export const PIPGoalSchema = z.object({
  title: z.string().min(1),
  dueDate: z.string().optional(),
  status: z.enum(['pending', 'met', 'missed']).default('pending'),
})
export type PIPGoal = z.infer<typeof PIPGoalSchema>

export const CreatePIPSchema = z.object({
  subjectId: z.string().min(1),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  reason: z.string().min(1).max(4000),
  goals: z.array(PIPGoalSchema).min(1, 'At least one goal is required'),
})

export const ClosePIPSchema = z.object({
  id: z.string().min(1),
  outcome: z.enum(['passed', 'failed', 'cancelled']),
})

export type ParsedPIPGoals = PIPGoal[]

export function parsePIPGoals(raw: string | null | undefined): ParsedPIPGoals {
  if (!raw) return []
  try {
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr.filter((g): g is PIPGoal => PIPGoalSchema.safeParse(g).success)
  } catch {
    return []
  }
}
