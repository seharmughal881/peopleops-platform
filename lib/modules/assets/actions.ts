'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/client'
import { requirePermission } from '@/lib/modules/auth'
import { recordAudit } from '@/lib/modules/audit'
import {
  CreateAssetSchema, AssignAssetSchema, ReturnAssetSchema,
  CreateLicenseSchema, AssignLicenseSchema,
} from './schemas'

export async function createAsset(formData: FormData) {
  const actor = await requirePermission('asset:*')
  const parsed = CreateAssetSchema.safeParse({
    tag: formData.get('tag'),
    category: formData.get('category'),
    name: formData.get('name'),
    serialNumber: formData.get('serialNumber') || undefined,
    purchaseDate: formData.get('purchaseDate') || undefined,
    warrantyEndDate: formData.get('warrantyEndDate') || undefined,
    purchaseCost: formData.get('purchaseCost') || undefined,
    currency: (formData.get('currency') as string) || 'USD',
    notes: formData.get('notes') || undefined,
  })
  if (!parsed.success) return { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors }

  try {
    const asset = await prisma.asset.create({ data: parsed.data })
    await recordAudit({
      userId: actor.id,
      action: 'asset.created',
      entityType: 'Asset',
      entityId: asset.id,
      after: { tag: asset.tag, category: asset.category },
    })
  } catch (e: any) {
    if (e?.code === 'P2002') return { error: 'Asset tag or serial number already exists' }
    throw e
  }

  revalidatePath('/admin/assets')
  return { ok: true }
}

export async function assignAsset(formData: FormData) {
  const actor = await requirePermission('asset:*')
  const parsed = AssignAssetSchema.safeParse({
    assetId: formData.get('assetId'),
    employeeId: formData.get('employeeId'),
    notes: formData.get('notes') || undefined,
  })
  if (!parsed.success) return { error: 'Validation failed' }

  const asset = await prisma.asset.findUnique({ where: { id: parsed.data.assetId } })
  if (!asset) return { error: 'Asset not found' }
  if (asset.status !== 'available') return { error: `Asset is ${asset.status}, not available` }

  const assignment = await prisma.assetAssignment.create({ data: parsed.data })
  await prisma.asset.update({ where: { id: parsed.data.assetId }, data: { status: 'assigned' } })

  await recordAudit({
    userId: actor.id,
    action: 'asset.assigned',
    entityType: 'Asset',
    entityId: asset.id,
    after: { employeeId: parsed.data.employeeId },
  })

  revalidatePath('/admin/assets')
  revalidatePath(`/admin/assets/${asset.id}`)
  return { ok: true, assignmentId: assignment.id }
}

export async function returnAsset(formData: FormData) {
  const actor = await requirePermission('asset:*')
  const parsed = ReturnAssetSchema.safeParse({
    assignmentId: formData.get('assignmentId'),
    condition: formData.get('condition') || 'good',
    notes: formData.get('notes') || undefined,
    nextStatus: formData.get('nextStatus') || 'available',
  })
  if (!parsed.success) return { error: 'Validation failed' }

  const assignment = await prisma.assetAssignment.findUnique({ where: { id: parsed.data.assignmentId } })
  if (!assignment) return { error: 'Assignment not found' }
  if (assignment.returnedAt) return { error: 'Already returned' }

  await prisma.assetAssignment.update({
    where: { id: assignment.id },
    data: { returnedAt: new Date(), conditionReturn: parsed.data.condition, notes: parsed.data.notes },
  })
  await prisma.asset.update({ where: { id: assignment.assetId }, data: { status: parsed.data.nextStatus } })

  await recordAudit({
    userId: actor.id,
    action: 'asset.returned',
    entityType: 'Asset',
    entityId: assignment.assetId,
    after: { condition: parsed.data.condition, nextStatus: parsed.data.nextStatus },
  })

  revalidatePath('/admin/assets')
  revalidatePath(`/admin/assets/${assignment.assetId}`)
  return { ok: true }
}

export async function setAssetStatus(formData: FormData) {
  const actor = await requirePermission('asset:*')
  const id = String(formData.get('id') || '')
  const status = String(formData.get('status') || '')
  if (!['available', 'maintenance', 'retired'].includes(status)) return { error: 'Invalid status' }

  const asset = await prisma.asset.findUnique({ where: { id } })
  if (!asset) return { error: 'Not found' }
  if (asset.status === 'assigned') return { error: 'Return the asset before changing status' }

  await prisma.asset.update({ where: { id }, data: { status } })
  await recordAudit({
    userId: actor.id,
    action: `asset.${status}`,
    entityType: 'Asset',
    entityId: id,
  })

  revalidatePath('/admin/assets')
  revalidatePath(`/admin/assets/${id}`)
  return { ok: true }
}

export async function createLicense(formData: FormData) {
  const actor = await requirePermission('asset:*')
  const parsed = CreateLicenseSchema.safeParse({
    name: formData.get('name'),
    vendor: formData.get('vendor') || undefined,
    licenseType: formData.get('licenseType') || 'subscription',
    seats: formData.get('seats') || 1,
    cost: formData.get('cost') || undefined,
    currency: (formData.get('currency') as string) || 'USD',
    renewalDate: formData.get('renewalDate') || undefined,
    notes: formData.get('notes') || undefined,
  })
  if (!parsed.success) return { error: 'Validation failed' }

  const license = await prisma.softwareLicense.create({ data: parsed.data })
  await recordAudit({
    userId: actor.id,
    action: 'license.created',
    entityType: 'SoftwareLicense',
    entityId: license.id,
    after: { name: license.name, seats: license.seats },
  })

  revalidatePath('/admin/licenses')
  return { ok: true, licenseId: license.id }
}

export async function assignLicense(formData: FormData) {
  const actor = await requirePermission('asset:*')
  const parsed = AssignLicenseSchema.safeParse({
    licenseId: formData.get('licenseId'),
    employeeId: formData.get('employeeId'),
  })
  if (!parsed.success) return { error: 'Validation failed' }

  const license = await prisma.softwareLicense.findUnique({
    where: { id: parsed.data.licenseId },
    include: { assignments: { where: { revokedAt: null } } },
  })
  if (!license) return { error: 'License not found' }
  if (license.assignments.length >= license.seats) return { error: 'No seats available' }

  const existing = license.assignments.find((a) => a.employeeId === parsed.data.employeeId)
  if (existing) return { error: 'Employee already has this license' }

  await prisma.licenseAssignment.create({ data: parsed.data })
  await recordAudit({
    userId: actor.id,
    action: 'license.assigned',
    entityType: 'SoftwareLicense',
    entityId: license.id,
    after: { employeeId: parsed.data.employeeId },
  })

  revalidatePath('/admin/licenses')
  revalidatePath(`/admin/licenses/${license.id}`)
  return { ok: true }
}

export async function revokeLicense(formData: FormData) {
  const actor = await requirePermission('asset:*')
  const assignmentId = String(formData.get('assignmentId') || '')
  const assignment = await prisma.licenseAssignment.findUnique({ where: { id: assignmentId } })
  if (!assignment) return { error: 'Not found' }
  if (assignment.revokedAt) return { error: 'Already revoked' }

  await prisma.licenseAssignment.update({
    where: { id: assignmentId },
    data: { revokedAt: new Date() },
  })
  await recordAudit({
    userId: actor.id,
    action: 'license.revoked',
    entityType: 'LicenseAssignment',
    entityId: assignmentId,
  })

  revalidatePath('/admin/licenses')
  revalidatePath(`/admin/licenses/${assignment.licenseId}`)
  return { ok: true }
}
