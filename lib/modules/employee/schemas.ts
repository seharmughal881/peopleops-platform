import { z } from 'zod'

export const CreateEmployeeSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  firstName: z.string().min(1).trim(),
  lastName: z.string().min(1).trim(),
  employeeCode: z.string().min(1).trim(),
  joinDate: z.coerce.date(),
  jobTitle: z.string().optional(),
  departmentId: z.string().optional(),
  managerId: z.string().optional(),
  tempPassword: z.string().min(8),
})

export const UpdateProfileSchema = z.object({
  firstName: z.string().min(1).trim().optional(),
  lastName: z.string().min(1).trim().optional(),
  phone: z.string().optional(),
  personalEmail: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
})

export type CreateEmployeeInput = z.infer<typeof CreateEmployeeSchema>
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>
