import 'server-only'
import { prisma } from '@/lib/db/client'

export async function myPayslips(employeeId: string) {
  return prisma.payslip.findMany({
    where: { employeeId },
    include: { payslipRun: true },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getPayslip(id: string, viewerEmployeeId?: string) {
  const slip = await prisma.payslip.findUnique({
    where: { id },
    include: { payslipRun: true, employee: true },
  })
  if (!slip) return null
  if (viewerEmployeeId && slip.employeeId !== viewerEmployeeId) return null
  return slip
}

export async function listPayslipRuns() {
  return prisma.payslipRun.findMany({
    orderBy: { periodStart: 'desc' },
    include: { _count: { select: { payslips: true } } },
  })
}

export async function getPayslipRun(id: string) {
  return prisma.payslipRun.findUnique({
    where: { id },
    include: {
      payslips: {
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeCode: true,
              department: { select: { name: true } },
            },
          },
        },
        orderBy: [{ employee: { lastName: 'asc' } }],
      },
    },
  })
}

export type PayrollDeductionLine = { label: string; amount: number }
function parseDeductions(raw: string): PayrollDeductionLine[] {
  try {
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr.filter(
      (x): x is PayrollDeductionLine =>
        x && typeof x === 'object' && typeof x.label === 'string' && typeof x.amount === 'number',
    )
  } catch {
    return []
  }
}

export interface PayrollDashboard {
  totalRuns: number
  finalizedRuns: number
  draftRuns: number
  totalGross: number
  totalNet: number
  byMonth: Array<{ month: string; gross: number; net: number; count: number }>
  byDepartment: Array<{ department: string; gross: number; net: number; count: number }>
  latestRun: { id: string; periodStart: Date; periodEnd: Date; status: string; payslips: number; gross: number; net: number } | null
}

export async function payrollDashboard(): Promise<PayrollDashboard> {
  const [runs, payslips] = await Promise.all([
    prisma.payslipRun.findMany({
      orderBy: { periodStart: 'desc' },
      include: { _count: { select: { payslips: true } } },
    }),
    prisma.payslip.findMany({
      include: {
        payslipRun: { select: { periodStart: true } },
        employee: { select: { department: { select: { name: true } } } },
      },
    }),
  ])

  const totalGross = payslips.reduce((s, p) => s + p.grossPay, 0)
  const totalNet = payslips.reduce((s, p) => s + p.netPay, 0)

  const monthMap = new Map<string, { gross: number; net: number; count: number }>()
  for (const p of payslips) {
    const d = new Date(p.payslipRun.periodStart)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const cur = monthMap.get(key) ?? { gross: 0, net: 0, count: 0 }
    cur.gross += p.grossPay
    cur.net += p.netPay
    cur.count += 1
    monthMap.set(key, cur)
  }
  const byMonth = Array.from(monthMap.entries())
    .map(([month, v]) => ({ month, ...v }))
    .sort((a, b) => a.month.localeCompare(b.month))

  const deptMap = new Map<string, { gross: number; net: number; count: number }>()
  for (const p of payslips) {
    const dept = p.employee.department?.name ?? 'Unassigned'
    const cur = deptMap.get(dept) ?? { gross: 0, net: 0, count: 0 }
    cur.gross += p.grossPay
    cur.net += p.netPay
    cur.count += 1
    deptMap.set(dept, cur)
  }
  const byDepartment = Array.from(deptMap.entries())
    .map(([department, v]) => ({ department, ...v }))
    .sort((a, b) => b.gross - a.gross)

  const finalizedRuns = runs.filter((r) => r.status === 'finalized').length
  const latestRun = runs[0]
    ? {
        id: runs[0].id,
        periodStart: runs[0].periodStart,
        periodEnd: runs[0].periodEnd,
        status: runs[0].status,
        payslips: runs[0]._count.payslips,
        gross: payslips.filter((p) => p.payslipRunId === runs[0]!.id).reduce((s, p) => s + p.grossPay, 0),
        net: payslips.filter((p) => p.payslipRunId === runs[0]!.id).reduce((s, p) => s + p.netPay, 0),
      }
    : null

  return {
    totalRuns: runs.length,
    finalizedRuns,
    draftRuns: runs.length - finalizedRuns,
    totalGross,
    totalNet,
    byMonth,
    byDepartment,
    latestRun,
  }
}

export function payslipDeductions(raw: string): PayrollDeductionLine[] {
  return parseDeductions(raw)
}
