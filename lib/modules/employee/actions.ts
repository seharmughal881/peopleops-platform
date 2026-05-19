'use server'

import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/client'
import { requirePermission, requireUser } from '@/lib/modules/auth'
import { recordAudit } from '@/lib/modules/audit'
import { CreateEmployeeSchema, UpdateProfileSchema } from './schemas'

export async function createEmployee(formData: FormData) {
  const actor = await requirePermission('employee:create')

  const parsed = CreateEmployeeSchema.safeParse({
    email: formData.get('email'),
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    employeeCode: formData.get('employeeCode'),
    joinDate: formData.get('joinDate'),
    jobTitle: formData.get('jobTitle') || undefined,
    departmentId: formData.get('departmentId') || undefined,
    managerId: formData.get('managerId') || undefined,
    tempPassword: formData.get('tempPassword'),
  })
  if (!parsed.success) {
    return { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const data = parsed.data
  const hashed = await bcrypt.hash(data.tempPassword, 10)

  const user = await prisma.user.create({
    data: {
      email: data.email,
      hashedPassword: hashed,
      status: 'active',
    },
  })

  const employee = await prisma.employee.create({
    data: {
      userId: user.id,
      firstName: data.firstName,
      lastName: data.lastName,
      employeeCode: data.employeeCode,
      joinDate: data.joinDate,
      jobTitle: data.jobTitle,
      departmentId: data.departmentId,
      managerId: data.managerId,
    },
  })

  const empRole = await prisma.role.findUnique({ where: { name: 'employee' } })
  if (empRole) {
    await prisma.userRole.create({ data: { userId: user.id, roleId: empRole.id } })
  }

  await recordAudit({
    userId: actor.id,
    action: 'employee.created',
    entityType: 'Employee',
    entityId: employee.id,
    after: { email: data.email, employeeCode: data.employeeCode },
  })

  revalidatePath('/admin/employees')
  return { ok: true, employeeId: employee.id }
}

export async function updateMyProfile(formData: FormData) {
  const user = await requireUser()
  if (!user.employee) throw new Error('No employee record for current user')

  const parsed = UpdateProfileSchema.safeParse({
    firstName: formData.get('firstName') || undefined,
    lastName: formData.get('lastName') || undefined,
    phone: formData.get('phone') || undefined,
    personalEmail: formData.get('personalEmail') || undefined,
    address: formData.get('address') || undefined,
  })
  if (!parsed.success) {
    return { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors }
  }
  const data = parsed.data

  const before = await prisma.employee.findUnique({
    where: { id: user.employee.id },
    include: { profile: true },
  })

  await prisma.$transaction([
    prisma.employee.update({
      where: { id: user.employee.id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
      },
    }),
    prisma.employeeProfile.upsert({
      where: { employeeId: user.employee.id },
      update: {
        phone: data.phone,
        personalEmail: data.personalEmail || null,
        address: data.address,
      },
      create: {
        employeeId: user.employee.id,
        phone: data.phone,
        personalEmail: data.personalEmail || null,
        address: data.address,
      },
    }),
  ])

  await recordAudit({
    userId: user.id,
    action: 'employee.profile.updated',
    entityType: 'Employee',
    entityId: user.employee.id,
    before,
    after: data,
  })

  revalidatePath('/profile')
  return { ok: true }
}
