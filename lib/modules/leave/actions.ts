'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/client'
import { requireUser, requirePermission } from '@/lib/modules/auth'
import { recordAudit } from '@/lib/modules/audit'
import { startApprovalChain, decideApproval } from '@/lib/modules/workflows'
import { resolveApprovers } from '@/lib/modules/workflows/rules'
import { notify } from '@/lib/modules/notifications'
import { sendLeaveDecisionEmail } from '@/lib/modules/comms/emails'
import { enqueue } from '@/lib/jobs/queue'
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

  let result
  try {
    result = await decideApproval({ approvalId, approverId: actor.id, decision, comments })
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to decide' }
  }

  const request = await prisma.leaveRequest.findUnique({
    where: { id: approval.entityId },
    include: { employee: true },
  })
  if (!request) return { error: 'Leave request not found' }

  if (result.chainComplete) {
    if (result.finalDecision === 'approved') {
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

    const decidedByName = actor.employee
      ? `${actor.employee.firstName} ${actor.employee.lastName}`
      : actor.email
    await sendLeaveDecisionEmail(request.employee.userId, {
      recipientName: `${request.employee.firstName} ${request.employee.lastName}`,
      decision: result.finalDecision ?? 'pending',
      leaveType: request.leaveType,
      startDate: request.startDate.toISOString().slice(0, 10),
      endDate: request.endDate.toISOString().slice(0, 10),
      days: request.days,
      comments,
      decidedBy: decidedByName,
      link: process.env.APP_URL ? `${process.env.APP_URL}/leave` : '/leave',
    })
  } else if (result.nextApproval) {
    await notify({
      userId: result.nextApproval.approverId,
      title: `Leave request from ${request.employee.firstName} ${request.employee.lastName}`,
      body: comments
        ? `Approved at level ${approval.level}. ${comments}`
        : `Approved at level ${approval.level}.`,
      link: '/manager/approvals',
    })
    await enqueue(
      { kind: 'leave.approval-reminder', approvalId: result.nextApproval.id },
      { delay: 24 * 60 * 60 * 1000 },
    )
  }

  await recordAudit({
    userId: actor.id,
    action: `leave.${decision}`,
    entityType: 'LeaveRequest',
    entityId: request.id,
  })

  revalidatePath('/manager/approvals')
  return { ok: true, chainComplete: result.chainComplete }
}

const VALID_LEAVE_TYPES = ['vacation', 'sick', 'personal', 'unpaid'] as const
const VALID_STATUSES = ['pending', 'approved', 'rejected', 'cancelled'] as const

export async function editLeaveRequest(formData: FormData) {
  const actor = await requirePermission('leave:approve')

  const id = String(formData.get('id') || '')
  if (!id) return { error: 'Missing id' }

  const existing = await prisma.leaveRequest.findUnique({
    where: { id },
    include: { employee: { select: { id: true, managerId: true, firstName: true, lastName: true, userId: true } } },
  })
  if (!existing) return { error: 'Leave request not found' }

  const isAdmin = actor.roles.includes('super_admin') || actor.roles.includes('hr_admin')
  if (!isAdmin) {
    if (!actor.employee || existing.employee.managerId !== actor.employee.id) {
      return { error: 'You can only edit leave for your direct reports' }
    }
  }

  const leaveType = String(formData.get('leaveType') || existing.leaveType)
  const startStr = String(formData.get('startDate') || '')
  const endStr = String(formData.get('endDate') || '')
  const reason = formData.get('reason') != null ? String(formData.get('reason')) : existing.reason
  const status = String(formData.get('status') || existing.status)

  if (!VALID_LEAVE_TYPES.includes(leaveType as typeof VALID_LEAVE_TYPES[number])) {
    return { error: 'Invalid leave type' }
  }
  if (!VALID_STATUSES.includes(status as typeof VALID_STATUSES[number])) {
    return { error: 'Invalid status' }
  }

  const startDate = startStr ? new Date(startStr) : existing.startDate
  const endDate = endStr ? new Date(endStr) : existing.endDate
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return { error: 'Invalid date' }
  }
  if (endDate < startDate) return { error: 'End date must be on or after start date' }

  const days = daysBetween(startDate, endDate)

  const wasApproved = existing.status === 'approved'
  const willBeApproved = status === 'approved'

  await prisma.$transaction(async (tx) => {
    if (wasApproved && existing.leaveType !== 'unpaid') {
      await tx.leaveBalance.update({
        where: {
          employeeId_leaveType_year: {
            employeeId: existing.employeeId,
            leaveType: existing.leaveType,
            year: existing.startDate.getFullYear(),
          },
        },
        data: { balance: { increment: existing.days } },
      }).catch(() => null)
    }

    if (willBeApproved && leaveType !== 'unpaid') {
      await tx.leaveBalance.upsert({
        where: {
          employeeId_leaveType_year: {
            employeeId: existing.employeeId,
            leaveType,
            year: startDate.getFullYear(),
          },
        },
        update: { balance: { decrement: days } },
        create: {
          employeeId: existing.employeeId,
          leaveType,
          year: startDate.getFullYear(),
          balance: -days,
        },
      })
    }

    await tx.leaveRequest.update({
      where: { id },
      data: {
        leaveType,
        startDate,
        endDate,
        days,
        reason: reason || null,
        status,
        decidedAt: status !== 'pending' ? new Date() : null,
      },
    })
  })

  await recordAudit({
    userId: actor.id,
    action: 'leave.edited',
    entityType: 'LeaveRequest',
    entityId: id,
    before: {
      leaveType: existing.leaveType,
      startDate: existing.startDate,
      endDate: existing.endDate,
      days: existing.days,
      status: existing.status,
      reason: existing.reason,
    },
    after: { leaveType, startDate, endDate, days, status, reason },
  })

  revalidatePath('/admin/leave')
  revalidatePath('/manager/leave')
  revalidatePath('/leave')
  return { ok: true }
}
