import { prisma } from '@/lib/db/client'

export async function getExpense(id: string) {
  return prisma.expense.findUnique({
    where: { id },
    include: { employee: true, receipts: true },
  })
}

export async function myExpenses(employeeId: string) {
  return prisma.expense.findMany({
    where: { employeeId },
    include: { receipts: true },
    orderBy: { expenseDate: 'desc' },
  })
}

export async function listAllExpenses(opts: { status?: string } = {}) {
  return prisma.expense.findMany({
    where: opts.status ? { status: opts.status } : undefined,
    include: {
      employee: { select: { firstName: true, lastName: true, employeeCode: true } },
      receipts: { select: { id: true } },
    },
    orderBy: [{ status: 'asc' }, { expenseDate: 'desc' }],
    take: 200,
  })
}

export async function pendingExpenseApprovalsFor(approverId: string) {
  const approvals = await prisma.approval.findMany({
    where: { approverId, status: 'pending', entityType: 'Expense' },
    orderBy: { createdAt: 'desc' },
  })
  const ids = approvals.map((a) => a.entityId)
  const expenses = await prisma.expense.findMany({
    where: { id: { in: ids } },
    include: { employee: true, receipts: { select: { id: true } } },
  })
  const byId = new Map(expenses.map((e) => [e.id, e]))
  return approvals.map((a) => ({ approval: a, expense: byId.get(a.entityId) }))
}

export async function summary() {
  const rows = await prisma.expense.groupBy({
    by: ['status'],
    _count: { _all: true },
    _sum: { amount: true },
  })
  return rows.map((r) => ({ status: r.status, count: r._count._all, total: r._sum.amount ?? 0 }))
}
