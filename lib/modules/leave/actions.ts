'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/client'
import { requireUser, requirePermission } from '@/lib/modules/auth'
import { recordAudit } from '@/lib/modules/audit'
import { startApprovalChain, decideApproval } from '@/lib/modules/workflows'
import { resolveApprovers } from '@/lib/modules/workflows/rules'
import { notify } from '@/lib/modules/notifications'
import { SubmitLeaveSchema } from './schemas'

function daysBetween(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime()
  return Math.floor(ms / (24 * 60 * 60 * 1000)) + 1
}

export async function submitLeaveRequest(formData: FormData) {
  const user = await requireUser()
  if (!user.employee) throw new Error('No employee record')

  const parsed = SubmitLeaveSchema.safeParse({
    leaveType: formData.get('leaveType'),
    startDate: formData.get('startDate'),
    endDate: formData.get('endDate'),
    reason: formData.get('reason') || undefined,
  })
  if (!parsed.success) {
    return { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors }
  }
  const data = parsed.data
  const days = daysBetween(data.startDate, data.endDate)

  const year = data.startDate.getFullYear()
  const balance = await prisma.leaveBalance.findUnique({
    where: {
      employeeId_leaveType_year: {
        employeeId: user.employee.id,
        leaveType: data.leaveType,
        year,
      },
    },
  })
  if (data.leaveType !== 'unpaid' && (!balance || balance.balance < days)) {
    return { error: `Insufficient ${data.leaveType} balance (${balance?.balance ?? 0} days remaining)` }
  }

  const request = await prisma.leaveRequest.create({
    data: {
      employeeId: user.employee.id,
      leaveType: data.leaveType,
      startDate: data.startDate,
      endDate: data.endDate,
      days,
      reason: data.reason,
      status: 'pending',
    },
  })

  const ruleApprovers = await resolveApprovers('LeaveRequest', {
    employeeId: user.employee.id,
    days,
    leaveType: data.leaveType,
  })

  let approverIds: string[] = ruleApprovers ?? []
  if (approverIds.length === 0) {
    const employee = await prisma.employee.findUnique({
      where: { id: user.employee.id },
      include: { manager: { include: { user: true } } },
    })
    if (employee?.manager?.user) approverIds.push(employee.manager.user.id)
    else {
      const hrAdminRole = await prisma.role.findUnique({ where: { name: 'hr_admin' } })
      if (hrAdminRole) {
        const hrUsers = await prisma.userRole.findMany({ where: { roleId: hrAdminRole.id }, take: 1 })
        if (hrUsers[0]) approverIds.push(hrUsers[0].userId)
      }
    }
  }

  if (approverIds.length > 0) {
    await startApprovalChain({
      entityType: 'LeaveRequest',
      entityId: request.id,
      approverIds,
      title: `Leave request from ${user.employee.firstName} ${user.employee.lastName}`,
      link: '/manager/approvals',
    })
  }

  await recordAudit({
    userId: user.id,
    action: 'leave.submitted',
    entityType: 'LeaveRequest',
    entityId: request.id,
    after: data,
  })

  revalidatePath('/leave')
  return { ok: true, requestId: request.id }
}

export async function decideLeaveRequest(formData: FormData) {
  const actor = await requirePermission('leave:approve')

  const approvalId = String(formData.get('approvalId') || '')
  const decision = String(formData.get('decision') || '') as 'approved' | 'rejected'
  const comments = String(formData.get('comments') || '') || undefined

  if (!approvalId || !['approved', 'rejected'].includes(decision)) {
    return { error: 'Invalid decision payload' }
  }

  const approval = await prisma.approval.findUnique({ where: { id: approvalId } })
  if (!approval) return { error: 'Approval not found' }

  await decideApproval({ approvalId, approverId: actor.id, decision, comments })

  const request = await prisma.leaveRequest.findUnique({
    where: { id: approval.entityId },
    include: { employee: { include: { user: true } } },
  })
  if (!request) return { error: 'Leave request not found' }

  if (decision === 'approved') {
    if (request.leaveType !== 'unpaid') {
      await prisma.leaveBalance.update({
        where: {
          employeeId_leaveType_year: {
            employeeId: request.employeeId,
            leaveType: request.leaveType,
            year: request.startDate.getFullYear(),
          },
        },
        data: { balance: { decrement: request.days } },
      })
    }
    await prisma.leaveRequest.update({
      where: { id: request.id },
      data: { status: 'approved', decidedAt: new Date() },
    })
  } else {
    await prisma.leaveRequest.update({
      where: { id: request.id },
      data: { status: 'rejected', decidedAt: new Date() },
    })
  }

  await notify({
    userId: request.employee.userId,
    title: `Leave ${decision}`,
    body: comments,
    link: '/leave',
  })

  await recordAudit({
    userId: actor.id,
    action: `leave.${decision}`,
    entityType: 'LeaveRequest',
    entityId: request.id,
  })

  revalidatePath('/manager/approvals')
  return { ok: true }
}
