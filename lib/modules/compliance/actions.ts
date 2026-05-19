'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requirePermission } from '@/lib/modules/auth'
import { hardDeleteEmployee } from './gdpr'
import { recordAudit } from '@/lib/modules/audit'

export async function deleteEmployeeGdpr(formData: FormData) {
  const actor = await requirePermission('employee:read')
  const id = String(formData.get('id') ?? '')
  const confirm = String(formData.get('confirm') ?? '')
  if (!id) return { error: 'Missing id' }
  if (confirm !== 'DELETE') return { error: 'Type DELETE to confirm' }
  if (!actor.roles.includes('super_admin') && !actor.roles.includes('hr_admin')) {
    return { error: 'Only HR / Super Admin can perform GDPR deletion' }
  }

  try {
    await hardDeleteEmployee(id, actor.id)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Deletion failed'
    return { error: msg }
  }

  await recordAudit({
    userId: actor.id,
    action: 'gdpr.delete.invoked',
    entityType: 'Employee',
    entityId: id,
  })

  revalidatePath('/admin/employees')
  redirect('/admin/employees')
}
