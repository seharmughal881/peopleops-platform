import 'server-only'
import { prisma } from '@/lib/db/client'
import { buildCsv } from './csv'
import { expenseGL, payrollGL } from './mapping'

export type DateRange = { from?: Date; to?: Date }

// Only reimbursed expenses are exported by default — those are the ones that
// actually hit the GL. Callers can include 'approved' to preview the upcoming
// month's GL impact before payments go out.
export async function exportExpensesCsv(
  range: DateRange,
  opts: { statuses?: ('approved' | 'reimbursed')[] } = {},
): Promise<{ csv: string; rowCount: number }> {
  const statuses = opts.statuses ?? ['reimbursed']
  const where = {
    status: { in: statuses },
    expenseDate: {
      gte: range.from ?? undefined,
      lte: range.to ?? undefined,
    },
  }
  const expenses = await prisma.expense.findMany({
    where,
    include: {
      employee: { select: { employeeCode: true, firstName: true, lastName: true, department: { select: { name: true } } } },
    },
    orderBy: [{ expenseDate: 'asc' }],
  })
  const rows = expenses.map((e) => {
    const gl = expenseGL(e.category)
    return [
      e.expenseDate.toISOString().slice(0, 10),
      e.id,
      e.employee.employeeCode,
      `${e.employee.firstName} ${e.employee.lastName}`,
      e.employee.department?.name ?? '',
      e.category,
      gl.account,
      gl.name,
      e.amount.toFixed(2),
      e.currency,
      e.status,
      e.reimbursedAt ? e.reimbursedAt.toISOString().slice(0, 10) : '',
      e.description ?? '',
    ]
  })
  const csv = buildCsv(
    [
      'expense_date', 'expense_id', 'employee_code', 'employee_name',
      'department', 'category', 'gl_account', 'gl_account_name',
      'amount', 'currency', 'status', 'reimbursed_date', 'description',
    ],
    rows,
  )
  return { csv, rowCount: rows.length }
}

// Payroll export: one row per payslip with three GL lines (gross / deductions / net)
// flattened into a single ledger-style row per payslip.
// Callers wanting strict double-entry should consume the JSON form via exportPayrollJSON.
export async function exportPayrollCsv(range: DateRange): Promise<{ csv: string; rowCount: number }> {
  const runs = await prisma.payslipRun.findMany({
    where: {
      status: 'finalized',
      finalizedAt: {
        gte: range.from ?? undefined,
        lte: range.to ?? undefined,
      },
    },
    include: {
      payslips: {
        include: { employee: { select: { employeeCode: true, firstName: true, lastName: true, department: { select: { name: true } } } } },
      },
    },
    orderBy: { finalizedAt: 'asc' },
  })

  const gross = payrollGL('gross')
  const deductions = payrollGL('deductions')
  const net = payrollGL('net')

  const rows: unknown[][] = []
  for (const run of runs) {
    const finalizedDate = run.finalizedAt ? run.finalizedAt.toISOString().slice(0, 10) : ''
    for (const p of run.payslips) {
      const deductionsTotal = p.grossPay - p.netPay
      rows.push([
        finalizedDate,
        run.id,
        run.periodStart.toISOString().slice(0, 10),
        run.periodEnd.toISOString().slice(0, 10),
        p.id,
        p.employee.employeeCode,
        `${p.employee.firstName} ${p.employee.lastName}`,
        p.employee.department?.name ?? '',
        p.grossPay.toFixed(2),
        gross.account,
        deductionsTotal.toFixed(2),
        deductions.account,
        p.netPay.toFixed(2),
        net.account,
      ])
    }
  }
  const csv = buildCsv(
    [
      'finalized_date', 'run_id', 'period_start', 'period_end',
      'payslip_id', 'employee_code', 'employee_name', 'department',
      'gross_pay', 'gross_gl_account',
      'deductions_total', 'deductions_gl_account',
      'net_pay', 'net_gl_account',
    ],
    rows,
  )
  return { csv, rowCount: rows.length }
}

export async function summarize(range: DateRange) {
  const [expenseCount, payslipCount, mapping] = await Promise.all([
    prisma.expense.count({
      where: {
        status: 'reimbursed',
        expenseDate: { gte: range.from, lte: range.to },
      },
    }),
    prisma.payslip.count({
      where: {
        payslipRun: {
          status: 'finalized',
          finalizedAt: { gte: range.from, lte: range.to },
        },
      },
    }),
    Promise.resolve((await import('./mapping')).fullMapping()),
  ])
  return { expenseCount, payslipCount, mapping }
}
