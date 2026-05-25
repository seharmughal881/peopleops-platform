'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/client'
import { requireUser } from '@/lib/modules/auth'
import { recordAudit } from '@/lib/modules/audit'
import { startApprovalChain, decideApproval } from '@/lib/modules/workflows'
import { notify } from '@/lib/modules/notifications'
import { SubmitOvertimeEntrySchema } from './schemas'

function dayStart(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export async function submitOvertimeEntry(formData: FormData) {
  const user = await requireUser()
  if (!user.employee) throw new Error('No employee record')

  const parsed = SubmitOvertimeEntrySchema.safeParse({
    workDate: formData.get('workDate'),
    hours: formData.get('hours'),
    reason: formData.get('reason'),
  })
  if (!parsed.success) {
    return { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors }
  }
  const data = parsed.data

  const today = dayStart(new Date())
  const work = dayStart(data.workDate)
  if (work.getTime() > today.getTime()) {
    return { error: 'Work date cannot be in the future' }
  }

  const entry = await prisma.overtimeEntry.create({
    data: {
      employeeId: user.employee.id,
      workDate: work,
      hours: data.hours,
      reason: data.reason,
      status: 'pending',
    },
  })

  // Route to manager → fall back to hr_admin.
  const approverIds: string[] = []
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

  if (approverIds.length > 0) {
    await startApprovalChain({
      entityType: 'OvertimeEntry',
      entityId: entry.id,
      approverIds,
      title: `Extra hours: ${data.hours}h from ${user.employee.firstName} ${user.employee.lastName}`,
      link: '/manager/approvals',
    })
  }

  await recordAudit({
    userId: user.id,
    action: 'overtime.submitted',
    entityType: 'OvertimeEntry',
    entityId: entry.id,
    after: { workDate: work.toISOString().slice(0, 10), hours: data.hours, reason: data.reason },
  })

  revalidatePath('/attendance')
  revalidatePath('/timesheet')
  return { ok: true, entryId: entry.id }
}

export async function cancelOvertimeEntry(formData: FormData) {
  const user = await requireUser()
  if (!user.employee) throw new Error('No employee record')

  const id = String(formData.get('id') || '')
  if (!id) return { error: 'Missing id' }

  const entry = await prisma.overtimeEntry.findUnique({ where: { id } })
  if (!entry) return { error: 'Entry not found' }
  if (entry.employeeId !== user.employee.id) return { error: 'Not your entry' }
  if (entry.status !== 'pending') return { error: 'Only pending entries can be cancelled' }

  await prisma.$transaction([
    prisma.overtimeEntry.update({
      where: { id },
      data: { status: 'cancelled', decidedAt: new Date() },
    }),
    // Close any open approval rows so they don't sit in approvers' queues.
    prisma.approval.updateMany({
      where: { entityType: 'OvertimeEntry', entityId: id, status: { in: ['pending', 'waiting'] } },
      data: { status: 'rejected', decidedAt: new Date(), comments: 'Cancelled by employee' },
    }),
  ])

  await recordAudit({
    userId: user.id,
    action: 'overtime.cancelled',
    entityType: 'OvertimeEntry',
    entityId: id,
  })

  revalidatePath('/attendance')
  revalidatePath('/timesheet')
  return { ok: true }
}

export async function decideOvertimeEntry(formData: FormData) {
  const actor = await requireUser()

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

  const entry = await prisma.overtimeEntry.findUnique({
    where: { id: approval.entityId },
    include: { employee: true },
  })
  if (!entry) return { error: 'Overtime entry not found' }

  if (result.chainComplete) {
    await prisma.overtimeEntry.update({
      where: { id: entry.id },
      data: {
        status: result.finalDecision === 'approved' ? 'approved' : 'rejected',
        decidedAt: new Date(),
      },
    })
    await notify({
      userId: entry.employee.userId,
      title:
        result.finalDecision === 'approved'
          ? `Extra hours approved (${entry.hours}h on ${entry.workDate.toISOString().slice(0, 10)})`
          : `Extra hours rejected (${entry.hours}h on ${entry.workDate.toISOString().slice(0, 10)})`,
      body: comments,
      link: '/timesheet',
    })
  } else if (result.nextApproval) {
    await notify({
      userId: result.nextApproval.approverId,
      title: `Extra hours from ${entry.employee.firstName} ${entry.employee.lastName}`,
      body: comments ? `Approved at level ${approval.level}. ${comments}` : `Approved at level ${approval.level}.`,
      link: '/manager/approvals',
    })
  }

  await recordAudit({
    userId: actor.id,
    action: `overtime.${decision}`,
    entityType: 'OvertimeEntry',
    entityId: entry.id,
  })

  revalidatePath('/manager/approvals')
  revalidatePath('/timesheet')
  return { ok: true, chainComplete: result.chainComplete }
}
