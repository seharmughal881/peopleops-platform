'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/db/client'
import { requirePermission } from '@/lib/modules/auth'
import { recordAudit } from '@/lib/modules/audit'
import { generateDeviceSecret, hashSecret } from './biometric'

const DeviceSchema = z.object({
  name: z.string().min(1).max(120),
  location: z.string().max(200).optional(),
  vendor: z.enum(['generic', 'zkteco', 'suprema', 'hikvision']).default('generic'),
  externalDeviceId: z.string().min(1).max(120),
})

const CredentialSchema = z.object({
  deviceId: z.string().min(1),
  employeeId: z.string().min(1),
  externalEmployeeId: z.string().min(1).max(120),
  label: z.string().max(120).optional(),
})

export async function createDevice(formData: FormData) {
  const actor = await requirePermission('employee:read')
  const parsed = DeviceSchema.safeParse({
    name: formData.get('name'),
    location: formData.get('location') || undefined,
    vendor: formData.get('vendor') || 'generic',
    externalDeviceId: formData.get('externalDeviceId'),
  })
  if (!parsed.success) return { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors }

  const secret = generateDeviceSecret()
  const device = await prisma.biometricDevice.create({
    data: { ...parsed.data, secretHash: hashSecret(secret) },
  })

  await recordAudit({
    userId: actor.id,
    action: 'biometric.device.created',
    entityType: 'BiometricDevice',
    entityId: device.id,
    after: { name: device.name, vendor: device.vendor, externalDeviceId: device.externalDeviceId },
  })

  revalidatePath('/admin/biometric')
  return { ok: true, deviceId: device.id, secret }
}

export async function toggleDevice(formData: FormData) {
  const actor = await requirePermission('employee:read')
  const id = String(formData.get('id') || '')
  const device = await prisma.biometricDevice.findUnique({ where: { id } })
  if (!device) return { error: 'Not found' }
  const next = device.status === 'active' ? 'disabled' : 'active'
  await prisma.biometricDevice.update({ where: { id }, data: { status: next } })
  await recordAudit({
    userId: actor.id,
    action: `biometric.device.${next}`,
    entityType: 'BiometricDevice',
    entityId: id,
  })
  revalidatePath('/admin/biometric')
  revalidatePath(`/admin/biometric/${id}`)
  return { ok: true }
}

export async function rotateDeviceSecret(formData: FormData) {
  const actor = await requirePermission('employee:read')
  const id = String(formData.get('id') || '')
  const device = await prisma.biometricDevice.findUnique({ where: { id } })
  if (!device) return { error: 'Not found' }
  const secret = generateDeviceSecret()
  await prisma.biometricDevice.update({ where: { id }, data: { secretHash: hashSecret(secret) } })
  await recordAudit({
    userId: actor.id,
    action: 'biometric.device.secret-rotated',
    entityType: 'BiometricDevice',
    entityId: id,
  })
  revalidatePath(`/admin/biometric/${id}`)
  return { ok: true, secret }
}

export async function enrollCredential(formData: FormData) {
  const actor = await requirePermission('employee:read')
  const parsed = CredentialSchema.safeParse({
    deviceId: formData.get('deviceId'),
    employeeId: formData.get('employeeId'),
    externalEmployeeId: formData.get('externalEmployeeId'),
    label: formData.get('label') || undefined,
  })
  if (!parsed.success) return { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors }

  const credential = await prisma.biometricCredential.create({ data: parsed.data })
  await recordAudit({
    userId: actor.id,
    action: 'biometric.credential.enrolled',
    entityType: 'BiometricCredential',
    entityId: credential.id,
    after: { deviceId: parsed.data.deviceId, employeeId: parsed.data.employeeId, externalEmployeeId: parsed.data.externalEmployeeId },
  })
  revalidatePath(`/admin/biometric/${parsed.data.deviceId}`)
  return { ok: true }
}

export async function removeCredential(formData: FormData) {
  const actor = await requirePermission('employee:read')
  const id = String(formData.get('id') || '')
  const credential = await prisma.biometricCredential.findUnique({ where: { id } })
  if (!credential) return { error: 'Not found' }
  await prisma.biometricCredential.delete({ where: { id } })
  await recordAudit({
    userId: actor.id,
    action: 'biometric.credential.removed',
    entityType: 'BiometricCredential',
    entityId: id,
  })
  revalidatePath(`/admin/biometric/${credential.deviceId}`)
  return { ok: true }
}
