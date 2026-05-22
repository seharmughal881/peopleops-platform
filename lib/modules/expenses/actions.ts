'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/client'
import { requireUser, requirePermission } from '@/lib/modules/auth'
import { recordAudit } from '@/lib/modules/audit'
import { startApprovalChain, decideApproval } from '@/lib/modules/workflows'
import { notify } from '@/lib/modules/notifications'
import { enqueue } from '@/lib/jobs/queue'
import { getStorage, buildKey } from '@/lib/storage'
import { SubmitExpenseSchema, validateReceiptFile } from './schemas'

async function ensureEmployee() {
  const user = await requireUser()
  if (!user.employee) throw new Error('No employee record')
  return user
}

export async function createExpense(formData: FormData) {
  const user = await ensureEmployee()
  const parsed = SubmitExpenseSchema.safeParse({
    category: formData.get('category'),
    amount: formData.get('amount'),
    currency: (formData.get('currency') as string) || 'USD',
    expenseDate: formData.get('expenseDate'),
    description: formData.get('description') || undefined,
  })
  if (!parsed.success) return { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors }

  const expense = await prisma.expense.create({
    data: {
      ...parsed.data,
      employeeId: user.employee!.id,
      status: 'draft',
    },
  })

  await recordAudit({
    userId: user.id,
    action: 'expense.created',
    entityType: 'Expense',
    entityId: expense.id,
    after: parsed.data,
  })

  revalidatePath('/expenses')
  return { ok: true, expenseId: expense.id }
}

export async function attachReceipt(formData: FormData) {
  const user = await ensureEmployee()
  const expenseId = String(formData.get('expenseId') || '')
  const file = formData.get('file')

  const expense = await prisma.expense.findUnique({ where: { id: expenseId } })
  if (!expense || expense.employeeId !== user.employee!.id) return { error: 'Not found' }
  if (expense.status !== 'draft') return { error: 'Can only attach receipts to draft expenses' }
  if (!(file instanceof File)) return { error: 'No file provided' }
  const v = validateReceiptFile(file)
  if (!v.ok) return { error: v.error }

  const bytes = new Uint8Array(await file.arrayBuffer())
  const key = buildKey(`receipts/${expense.id}`, file.name)
  await getStorage().put(key, bytes, file.type || 'application/octet-stream')

  await prisma.expenseReceipt.create({
    data: { expenseId: expense.id, name: file.name, s3Key: key },
  })

  await recordAudit({
    userId: user.id,
    action: 'expense.receipt.attached',
    entityType: 'Expense',
    entityId: expense.id,
    after: { name: file.name },
  })

  revalidatePath('/expenses')
  return { ok: true }
}

export async function submitExpense(formData: FormData) {
  const user = await ensureEmployee()
  const id = String(formData.get('id') || '')
  const expense = await prisma.expense.findUnique({
    where: { id },
    include: { receipts: true, employee: { include: { manager: { include: { user: true } } } } },
  })
  if (!expense || expense.employeeId !== user.employee!.id) return { error: 'Not found' }
  if (expense.status !== 'draft') return { error: 'Already submitted' }
  if (expense.receipts.length === 0) return { error: 'Attach at least one receipt before submitting' }

  const approverIds: string[] = []
  if (expense.employee.manager?.user) approverIds.push(expense.employee.manager.user.id)
  // Finance second level for amounts >= 1000
  if (expense.amount >= 1000) {
    const financeRole = await prisma.role.findUnique({ where: { name: 'finance' } })
    if (financeRole) {
      const first = await prisma.userRole.findFirst({ where: { roleId: financeRole.id }, select: { userId: true } })
      if (first) approverIds.push(first.userId)
    }
  }
  if (approverIds.length === 0) {
    const hrAdminRole = await prisma.role.findUnique({ where: { name: 'hr_admin' } })
    if (hrAdminRole) {
      const first = await prisma.userRole.findFirst({ where: { roleId: hrAdminRole.id }, select: { userId: true } })
      if (first) approverIds.push(first.userId)
    }
  }
  if (approverIds.length === 0) return { error: 'No approver found' }

  await prisma.expense.update({
    where: { id },
    data: { status: 'submitted', submittedAt: new Date() },
  })

  await startApprovalChain({
    entityType: 'Expense',
    entityId: id,
    approverIds,
    title: `Expense ${expense.amount.toFixed(2)} ${expense.currency} from ${expense.employee.firstName} ${expense.employee.lastName}`,
    link: '/manager/approvals',
  })

  await recordAudit({
    userId: user.id,
    action: 'expense.submitted',
    entityType: 'Expense',
    entityId: id,
    after: { approvers: approverIds.length, amount: expense.amount },
  })

  revalidatePath('/expenses')
  return { ok: true }
}

export async function decideExpense(formData: FormData) {
  const actor = await requireUser()

  const approvalId = String(formData.get('approvalId') || '')
  const decision = String(formData.get('decision') || '') as 'approved' | 'rejected'
  const comments = String(formData.get('comments') || '') || undefined

  if (!approvalId || !['approved', 'rejected'].includes(decision)) {
    return { error: 'Invalid decision payload' }
  }
  const approval = await prisma.approval.findUnique({ where: { id: approvalId } })
  if (!approval) return { error: 'Approval not found' }
  if (approval.entityType !== 'Expense') return { error: 'Wrong approval kind' }
  if (approval.approverId !== actor.id) return { error: 'Not the assigned approver' }

  let result
  try {
    result = await decideApproval({ approvalId, approverId: actor.id, decision, comments })
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to decide' }
  }

  const expense = await prisma.expense.findUnique({
    where: { id: approval.entityId },
    include: { employee: true },
  })
  if (!expense) return { error: 'Expense not found' }

  if (result.chainComplete) {
    await prisma.expense.update({
      where: { id: expense.id },
      data: { status: result.finalDecision!, decidedAt: new Date() },
    })
    await notify({
      userId: expense.employee.userId,
      title: `Expense ${result.finalDecision === 'approved' ? 'fully approved' : 'rejected'}`,
      body: comments,
      link: '/expenses',
    })
  } else if (result.nextApproval) {
    await notify({
      userId: result.nextApproval.approverId,
      title: `Expense ${expense.amount.toFixed(2)} ${expense.currency} from ${expense.employee.firstName} ${expense.employee.lastName}`,
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
    action: `expense.${decision}`,
    entityType: 'Expense',
    entityId: expense.id,
  })

  revalidatePath('/manager/approvals')
  revalidatePath('/admin/expenses')
  return { ok: true, chainComplete: result.chainComplete }
}

export async function markReimbursed(formData: FormData) {
  const actor = await requirePermission('expense:*')
  const id = String(formData.get('id') || '')
  const expense = await prisma.expense.findUnique({
    where: { id },
    include: { employee: true },
  })
  if (!expense) return { error: 'Not found' }
  if (expense.status !== 'approved') return { error: 'Only approved expenses can be reimbursed' }

  await prisma.expense.update({
    where: { id },
    data: { status: 'reimbursed', reimbursedAt: new Date() },
  })

  await notify({
    userId: expense.employee.userId,
    title: 'Expense reimbursed',
    body: `${expense.amount.toFixed(2)} ${expense.currency} has been reimbursed.`,
    link: '/expenses',
  })

  await recordAudit({
    userId: actor.id,
    action: 'expense.reimbursed',
    entityType: 'Expense',
    entityId: id,
  })

  revalidatePath('/admin/expenses')
  return { ok: true }
}

export async function withdrawExpense(formData: FormData) {
  const user = await ensureEmployee()
  const id = String(formData.get('id') || '')
  const expense = await prisma.expense.findUnique({ where: { id } })
  if (!expense || expense.employeeId !== user.employee!.id) return { error: 'Not found' }
  if (!['draft', 'submitted'].includes(expense.status)) return { error: 'Cannot withdraw' }

  await prisma.$transaction([
    prisma.approval.updateMany({
      where: { entityType: 'Expense', entityId: id, status: { in: ['pending', 'waiting'] } },
      data: { status: 'rejected', decidedAt: new Date(), comments: 'Withdrawn by employee' },
    }),
    prisma.expense.delete({ where: { id } }),
  ])

  await recordAudit({
    userId: user.id,
    action: 'expense.withdrawn',
    entityType: 'Expense',
    entityId: id,
  })

  revalidatePath('/expenses')
  return { ok: true }
}
