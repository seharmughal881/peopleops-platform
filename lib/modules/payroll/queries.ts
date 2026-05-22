import 'server-only'
import { prisma } from '@/lib/db/client'
import { baseCurrency, convertToBase } from './fx'

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

export interface ListPayslipRunsPagedOpts {
  q?: string
  status?: string
  sort?: 'periodStart' | 'createdAt' | 'status'
  order?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

export async function listPayslipRunsPaged(opts: ListPayslipRunsPagedOpts = {}) {
  const page = Math.max(1, opts.page ?? 1)
  const pageSize = Math.max(1, Math.min(200, opts.pageSize ?? 25))
  const skip = (page - 1) * pageSize

  const where = {
    ...(opts.status ? { status: opts.status } : {}),
    ...(opts.q
      ? {
          OR: [
            { status: { contains: opts.q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  }

  const sortField = opts.sort ?? 'periodStart'
  const order = opts.order ?? 'desc'

  const [rows, total] = await Promise.all([
    prisma.payslipRun.findMany({
      where,
      include: { _count: { select: { payslips: true } } },
      orderBy: { [sortField]: order },
      skip,
      take: pageSize,
    }),
    prisma.payslipRun.count({ where }),
  ])

  return { rows, total, page, pageSize }
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

export interface CurrencyBreakdown {
  currency: string
  nativeGross: number
  nativeNet: number
  convertedGross: number // in base currency
  convertedNet: number
  count: number
  rate: number | null // null = no FX rate available; converted values fall back to native
}

export interface PayrollDashboard {
  baseCurrency: string
  totalRuns: number
  finalizedRuns: number
  draftRuns: number
  totalGross: number // in base currency
  totalNet: number   // in base currency
  byMonth: Array<{ month: string; gross: number; net: number; count: number }>      // base
  byDepartment: Array<{ department: string; gross: number; net: number; count: number }> // base
  byCurrency: CurrencyBreakdown[]
  missingRates: string[] // currencies lacking an FX rate
  latestRun: { id: string; periodStart: Date; periodEnd: Date; status: string; payslips: number; gross: number; net: number } | null
}

// Dashboard scope: trailing 24 months of payslips. Bounds the working set so
// memory/latency stay predictable as payroll history grows. Runs list is
// independently capped at 24 most recent.
const DASHBOARD_RUN_LIMIT = 24
const DASHBOARD_MONTHS = 24

export async function payrollDashboard(): Promise<PayrollDashboard> {
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - DASHBOARD_MONTHS)

  const [runs, payslips] = await Promise.all([
    prisma.payslipRun.findMany({
      orderBy: { periodStart: 'desc' },
      take: DASHBOARD_RUN_LIMIT,
      include: { _count: { select: { payslips: true } } },
    }),
    prisma.payslip.findMany({
      where: { payslipRun: { periodStart: { gte: cutoff } } },
      include: {
        payslipRun: { select: { periodStart: true } },
        employee: { select: { department: { select: { name: true } } } },
      },
    }),
  ])

  const base = baseCurrency()

  // Pre-compute conversions once per payslip so the rest is straight aggregation.
  const enriched = payslips.map((p) => {
    const grossConv = convertToBase(p.grossPay, p.currency)
    const netConv = convertToBase(p.netPay, p.currency)
    return {
      ...p,
      convertedGross: grossConv.amount,
      convertedNet: netConv.amount,
      conversionRate: grossConv.rate,
    }
  })

  const totalGross = enriched.reduce((s, p) => s + p.convertedGross, 0)
  const totalNet = enriched.reduce((s, p) => s + p.convertedNet, 0)

  const monthMap = new Map<string, { gross: number; net: number; count: number }>()
  for (const p of enriched) {
    const d = new Date(p.payslipRun.periodStart)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const cur = monthMap.get(key) ?? { gross: 0, net: 0, count: 0 }
    cur.gross += p.convertedGross
    cur.net += p.convertedNet
    cur.count += 1
    monthMap.set(key, cur)
  }
  const byMonth = Array.from(monthMap.entries())
    .map(([month, v]) => ({ month, ...v }))
    .sort((a, b) => a.month.localeCompare(b.month))

  const deptMap = new Map<string, { gross: number; net: number; count: number }>()
  for (const p of enriched) {
    const dept = p.employee.department?.name ?? 'Unassigned'
    const cur = deptMap.get(dept) ?? { gross: 0, net: 0, count: 0 }
    cur.gross += p.convertedGross
    cur.net += p.convertedNet
    cur.count += 1
    deptMap.set(dept, cur)
  }
  const byDepartment = Array.from(deptMap.entries())
    .map(([department, v]) => ({ department, ...v }))
    .sort((a, b) => b.gross - a.gross)

  const currencyMap = new Map<string, CurrencyBreakdown>()
  for (const p of enriched) {
    const entry = currencyMap.get(p.currency) ?? {
      currency: p.currency,
      nativeGross: 0,
      nativeNet: 0,
      convertedGross: 0,
      convertedNet: 0,
      count: 0,
      rate: p.conversionRate,
    }
    entry.nativeGross += p.grossPay
    entry.nativeNet += p.netPay
    entry.convertedGross += p.convertedGross
    entry.convertedNet += p.convertedNet
    entry.count += 1
    currencyMap.set(p.currency, entry)
  }
  const byCurrency = Array.from(currencyMap.values()).sort((a, b) => b.convertedGross - a.convertedGross)
  const missingRates = byCurrency.filter((c) => c.rate === null && c.currency !== base).map((c) => c.currency)

  const finalizedRuns = runs.filter((r) => r.status === 'finalized').length
  const latestRun = runs[0]
    ? {
        id: runs[0].id,
        periodStart: runs[0].periodStart,
        periodEnd: runs[0].periodEnd,
        status: runs[0].status,
        payslips: runs[0]._count.payslips,
        gross: enriched.filter((p) => p.payslipRunId === runs[0]!.id).reduce((s, p) => s + p.convertedGross, 0),
        net: enriched.filter((p) => p.payslipRunId === runs[0]!.id).reduce((s, p) => s + p.convertedNet, 0),
      }
    : null

  return {
    baseCurrency: base,
    totalRuns: runs.length,
    finalizedRuns,
    draftRuns: runs.length - finalizedRuns,
    totalGross,
    totalNet,
    byMonth,
    byDepartment,
    byCurrency,
    missingRates,
    latestRun,
  }
}

export function payslipDeductions(raw: string): PayrollDeductionLine[] {
  return parseDeductions(raw)
}
