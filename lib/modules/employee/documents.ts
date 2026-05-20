'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/client'
import { requireUser } from '@/lib/modules/auth'
import { recordAudit } from '@/lib/modules/audit'
import { getStorage, buildKey } from '@/lib/storage'

const MAX_BYTES = 20 * 1024 * 1024 // 20 MB
const ALLOWED_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

export async function uploadDocument(formData: FormData) {
  const actor = await requireUser()

  const employeeId = String(formData.get('employeeId') || '')
  const type = String(formData.get('type') || 'other')
  const expiresAtRaw = String(formData.get('expiresAt') || '')
  const file = formData.get('file')

  if (!employeeId) return { error: 'employeeId is required' }

  const ownsIt = actor.employee?.id === employeeId
  const isAdmin = actor.permissions.includes('*') || actor.permissions.includes('employee:read')
  if (!ownsIt && !isAdmin) return { error: 'Forbidden' }
  if (!(file instanceof File)) return { error: 'No file provided' }
  if (file.size === 0) return { error: 'Empty file' }
  if (file.size > MAX_BYTES) return { error: 'File exceeds 20MB' }
  if (file.type && !ALLOWED_TYPES.has(file.type)) {
    return { error: `Unsupported file type: ${file.type}` }
  }

  const bytes = new Uint8Array(await file.arrayBuffer())
  const key = buildKey(`documents/${employeeId}`, file.name)
  await getStorage().put(key, bytes, file.type || 'application/octet-stream')

  const doc = await prisma.document.create({
    data: {
      employeeId,
      type,
      name: file.name,
      s3Key: key,
      expiresAt: expiresAtRaw ? new Date(expiresAtRaw) : null,
    },
  })

  await recordAudit({
    userId: actor.id,
    action: 'document.uploaded',
    entityType: 'Document',
    entityId: doc.id,
    after: { name: doc.name, type: doc.type, employeeId },
  })

  revalidatePath(`/admin/employees/${employeeId}`)
  revalidatePath('/documents')
  return { ok: true, documentId: doc.id }
}

export async function deleteDocument(formData: FormData) {
  const actor = await requireUser()
  const id = String(formData.get('id') || '')
  if (!id) return { error: 'Missing id' }

  const doc = await prisma.document.findUnique({ where: { id } })
  if (!doc) return { error: 'Not found' }

  const ownsIt = actor.employee?.id === doc.employeeId
  const isAdmin = actor.permissions.includes('*') || actor.permissions.includes('employee:read')
  if (!ownsIt && !isAdmin) return { error: 'Forbidden' }

  await getStorage().delete(doc.s3Key).catch(() => undefined)
  await prisma.document.delete({ where: { id } })

  await recordAudit({
    userId: actor.id,
    action: 'document.deleted',
    entityType: 'Document',
    entityId: id,
    before: { name: doc.name, type: doc.type },
  })

  revalidatePath(`/admin/employees/${doc.employeeId}`)
  revalidatePath('/documents')
  return { ok: true }
}

export async function listDocumentsFor(employeeId: string) {
  return prisma.document.findMany({
    where: { employeeId },
    orderBy: { uploadedAt: 'desc' },
  })
}
