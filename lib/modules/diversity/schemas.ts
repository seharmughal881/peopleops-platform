import { z } from 'zod'

// All option lists end with `prefer_not_to_say` so respondents can decline
// while still recording that they were asked. Empty string = not disclosed.

export const GENDER_OPTIONS = [
  { value: 'woman', label: 'Woman' },
  { value: 'man', label: 'Man' },
  { value: 'non_binary', label: 'Non-binary' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
] as const

export const ETHNICITY_OPTIONS = [
  { value: 'asian', label: 'Asian' },
  { value: 'black', label: 'Black or African American' },
  { value: 'hispanic', label: 'Hispanic or Latino' },
  { value: 'native_american', label: 'American Indian or Alaska Native' },
  { value: 'pacific_islander', label: 'Native Hawaiian or Other Pacific Islander' },
  { value: 'white', label: 'White' },
  { value: 'two_or_more', label: 'Two or more races' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
] as const

export const VETERAN_OPTIONS = [
  { value: 'protected', label: 'I am a protected veteran' },
  { value: 'not_protected', label: 'I am not a protected veteran' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
] as const

export const DISABILITY_OPTIONS = [
  { value: 'has_disability', label: 'Yes, I have a disability' },
  { value: 'no_disability', label: 'No, I do not have a disability' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
] as const

const optional = (allowed: readonly { value: string }[]) =>
  z.preprocess(
    (v) => (v === '' || v == null ? null : v),
    z
      .enum(allowed.map((o) => o.value) as [string, ...string[]])
      .nullable()
      .optional(),
  )

export const DiversitySchema = z.object({
  gender: optional(GENDER_OPTIONS),
  pronouns: z
    .preprocess((v) => (v === '' || v == null ? null : v), z.string().max(40).nullable().optional()),
  ethnicity: optional(ETHNICITY_OPTIONS),
  veteranStatus: optional(VETERAN_OPTIONS),
  disabilityStatus: optional(DISABILITY_OPTIONS),
})

export type DiversityInput = z.infer<typeof DiversitySchema>

export const K_ANONYMITY_THRESHOLD = 5
