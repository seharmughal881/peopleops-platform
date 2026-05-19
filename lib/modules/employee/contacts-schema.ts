import { z } from 'zod'

export const ContactSchema = z.object({
  name: z.string().min(1),
  relation: z.string().min(1),
  phone: z.string().min(1),
})

export type EmergencyContact = z.infer<typeof ContactSchema>

export function parseEmergencyContacts(raw: string | null | undefined): EmergencyContact[] {
  if (!raw) return []
  try {
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr.filter((c): c is EmergencyContact => ContactSchema.safeParse(c).success)
  } catch {
    return []
  }
}
