import { z } from 'zod'

export const ASSET_CATEGORIES = ['laptop', 'desktop', 'phone', 'tablet', 'monitor', 'accessory', 'other'] as const
export const ASSET_STATUSES = ['available', 'assigned', 'maintenance', 'retired'] as const
export const RETURN_CONDITIONS = ['good', 'damaged', 'missing'] as const
export const LICENSE_TYPES = ['perpetual', 'subscription'] as const

export const CreateAssetSchema = z.object({
  tag: z.string().min(1).max(60),
  category: z.enum(ASSET_CATEGORIES),
  name: z.string().min(1).max(200),
  serialNumber: z.string().max(200).optional(),
  purchaseDate: z.coerce.date().optional(),
  warrantyEndDate: z.coerce.date().optional(),
  purchaseCost: z.coerce.number().nonnegative().optional(),
  currency: z.string().min(3).max(3).default('USD'),
  notes: z.string().max(2000).optional(),
})

export const AssignAssetSchema = z.object({
  assetId: z.string().min(1),
  employeeId: z.string().min(1),
  notes: z.string().max(2000).optional(),
})

export const ReturnAssetSchema = z.object({
  assignmentId: z.string().min(1),
  condition: z.enum(RETURN_CONDITIONS).default('good'),
  notes: z.string().max(2000).optional(),
  nextStatus: z.enum(['available', 'maintenance', 'retired']).default('available'),
})

export const CreateLicenseSchema = z.object({
  name: z.string().min(1).max(120),
  vendor: z.string().max(120).optional(),
  licenseType: z.enum(LICENSE_TYPES).default('subscription'),
  seats: z.coerce.number().int().min(1).default(1),
  cost: z.coerce.number().nonnegative().optional(),
  currency: z.string().min(3).max(3).default('USD'),
  renewalDate: z.coerce.date().optional(),
  notes: z.string().max(2000).optional(),
})

export const AssignLicenseSchema = z.object({
  licenseId: z.string().min(1),
  employeeId: z.string().min(1),
})
