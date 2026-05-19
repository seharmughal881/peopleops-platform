import { z } from 'zod'

export const PLAN_TYPES = ['health', 'dental', 'vision', 'life', 'retirement'] as const
export type PlanType = (typeof PLAN_TYPES)[number]

export const COVERAGE_LEVELS = ['employee', 'employee+spouse', 'family'] as const
export type CoverageLevel = (typeof COVERAGE_LEVELS)[number]

export const DEPENDENT_RELATIONS = ['spouse', 'child', 'domestic_partner', 'other'] as const
export type DependentRelation = (typeof DEPENDENT_RELATIONS)[number]

const optionalDate = z.preprocess(
  (v) => (v === '' || v == null ? undefined : v),
  z.coerce.date().optional(),
)

export const PlanInputSchema = z.object({
  name: z.string().min(1).max(120),
  type: z.enum(PLAN_TYPES),
  description: z.string().max(2000).optional(),
  monthlyPremium: z.coerce.number().nonnegative(),
  employerShare: z.coerce.number().nonnegative().default(0),
  coversDependents: z.coerce.boolean().default(true),
  enrollOpensAt: optionalDate,
  enrollClosesAt: optionalDate,
})
export type PlanInput = z.infer<typeof PlanInputSchema>

export const EnrollSchema = z.object({
  planId: z.string().min(1),
  coverageLevel: z.enum(COVERAGE_LEVELS).default('employee'),
  effectiveFrom: z.coerce.date().optional(),
})

export const DependentSchema = z.object({
  enrollmentId: z.string().min(1),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  relation: z.enum(DEPENDENT_RELATIONS),
  dob: optionalDate,
})
