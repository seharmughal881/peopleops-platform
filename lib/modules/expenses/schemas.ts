import { z } from 'zod'

export const CATEGORIES = ['travel', 'meals', 'supplies', 'training', 'other'] as const
export type ExpenseCategory = (typeof CATEGORIES)[number]

export const SubmitExpenseSchema = z.object({
  category: z.enum(CATEGORIES),
  amount: z.coerce.number().positive(),
  currency: z.string().min(3).max(3).default('USD'),
  expenseDate: z.coerce.date(),
  description: z.string().max(2000).optional(),
})

export type SubmitExpenseInput = z.infer<typeof SubmitExpenseSchema>

const MAX_RECEIPT_BYTES = 10 * 1024 * 1024 // 10 MB
const ALLOWED_RECEIPT_TYPES = new Set([
  'application/pdf', 'image/png', 'image/jpeg', 'image/webp',
])

export function validateReceiptFile(file: File): { ok: true } | { ok: false; error: string } {
  if (file.size === 0) return { ok: false, error: 'Empty file' }
  if (file.size > MAX_RECEIPT_BYTES) return { ok: false, error: 'Receipt exceeds 10MB' }
  if (file.type && !ALLOWED_RECEIPT_TYPES.has(file.type)) {
    return { ok: false, error: `Unsupported receipt type: ${file.type}` }
  }
  return { ok: true }
}
