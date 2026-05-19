'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/client'
import { requirePermission } from '@/lib/modules/auth'
import { recordAudit } from '@/lib/modules/audit'
import { CreateJobSchema } from './schemas'

export async function createJob(formData: FormData) {
  const actor = await requirePermission('hiring:write')
  if (!actor.employee) return { error: 'No employee record' }

  const parsed = CreateJobSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description'),
    departmentId: formData.get('departmentId') || undefined,
    location: formData.get('location') || undefined,
    employmentType: formData.get('employmentType') || 'fullTime',
    salaryMin: formData.get('salaryMin') || undefined,
    salaryMax: formData.get('salaryMax') || undefined,
    currency: (formData.get('currency') as string) || 'USD',
  })
  if (!parsed.success) {
    return { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const job = await prisma.jobPosting.create({
    data: { ...parsed.data, createdById: actor.employee.id },
  })
  await recordAudit({
    userId: actor.id,
    action: 'job.created',
    entityType: 'JobPosting',
    entityId: job.id,
    after: { title: job.title },
  })

  revalidatePath('/admin/recruitment')
  return { ok: true, jobId: job.id }
}

export async function setJobStatus(formData: FormData) {
  const actor = await requirePermission('hiring:write')
  const id = String(formData.get('id') || '')
  const status = String(formData.get('status') || '')
  if (!['draft', 'open', 'closed', 'filled'].includes(status)) return { error: 'Invalid status' }

  const data: any = { status }
  if (status === 'open') data.openedAt = new Date()
  if (status === 'closed' || status === 'filled') data.closedAt = new Date()

  const job = await prisma.jobPosting.update({ where: { id }, data })
  await recordAudit({
    userId: actor.id,
    action: `job.${status}`,
    entityType: 'JobPosting',
    entityId: job.id,
  })

  revalidatePath('/admin/recruitment')
  revalidatePath(`/admin/recruitment/jobs/${id}`)
  return { ok: true }
}
