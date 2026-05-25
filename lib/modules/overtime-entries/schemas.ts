import { z } from 'zod'

export const SubmitOvertimeEntrySchema = z.object({
  workDate: z.coerce.date(),
  hours: z.coerce.number().positive().max(24),
  reason: z.string().trim().min(3, 'Please describe what you worked on'),
})

export type SubmitOvertimeEntryInput = z.infer<typeof SubmitOvertimeEntrySchema>
