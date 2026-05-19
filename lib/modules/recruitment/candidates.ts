'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/client'
import { requirePermission } from '@/lib/modules/auth'
import { recordAudit } from '@/lib/modules/audit'
import { getStorage, buildKey } from '@/lib/storage'
import { AddCandidateSchema, CANDIDATE_STAGES, validateResume } from './schemas'

export async function addCandidate(formData: FormData) {
  const actor = await requirePermission('hiring:write')

  const parsed = AddCandidateSchema.safeParse({
    jobPostingId: formData.get('jobPostingId'),
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    email: formData.get('email'),
    phone: formData.get('phone') || undefined,
    source: formData.get('source') || 'direct',
    notes: formData.get('notes') || undefined,
  })
  if (!parsed.success) {
    return { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors }
  }

  let resumeKey: string | undefined
  const resume = formData.get('resume')
  if (resume instanceof File && resume.size > 0) {
    const v = validateResume(resume)
    if (!v.ok) return { error: v.error }
    const bytes = new Uint8Array(await resume.arrayBuffer())
    resumeKey = buildKey(`resumes/${parsed.data.jobPostingId}`, resume.name)
    await getStorage().put(resumeKey, bytes, resume.type || 'application/octet-stream')
  }

  const candidate = await prisma.candidate.create({
    data: { ...parsed.data, resumeS3Key: resumeKey },
  })
  await recordAudit({
    userId: actor.id,
    action: 'candidate.added',
    entityType: 'Candidate',
    entityId: candidate.id,
    after: { email: candidate.email, jobPostingId: candidate.jobPostingId },
  })

  revalidatePath(`/admin/recruitment/jobs/${parsed.data.jobPostingId}`)
  revalidatePath('/admin/recruitment')
  return { ok: true, candidateId: candidate.id }
}

export async function advanceCandidate(formData: FormData) {
  const actor = await requirePermission('hiring:write')
  const id = String(formData.get('id') || '')
  const stage = String(formData.get('stage') || '')
  if (!CANDIDATE_STAGES.includes(stage as any)) return { error: 'Invalid stage' }

  const existing = await prisma.candidate.findUnique({ where: { id } })
  if (!existing) return { error: 'Not found' }

  const candidate = await prisma.candidate.update({
    where: { id },
    data: { stage },
  })
  await recordAudit({
    userId: actor.id,
    action: `candidate.${stage}`,
    entityType: 'Candidate',
    entityId: candidate.id,
    before: { stage: existing.stage },
    after: { stage: candidate.stage },
  })

  revalidatePath(`/admin/recruitment/candidates/${id}`)
  revalidatePath(`/admin/recruitment/jobs/${candidate.jobPostingId}`)
  revalidatePath('/admin/recruitment')
  return { ok: true }
}
