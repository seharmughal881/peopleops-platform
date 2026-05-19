import { z } from 'zod'

export const SubmitLeaveSchema = z.object({
  leaveType: z.enum(['vacation', 'sick', 'personal', 'unpaid']),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  reason: z.string().optional(),
}).refine((v) => v.endDate >= v.startDate, { message: 'End date must be after start date', path: ['endDate'] })

export type SubmitLeaveInput = z.infer<typeof SubmitLeaveSchema>
