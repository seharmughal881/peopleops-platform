import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/modules/auth'
import { getPayslipRun, payslipDeductions } from '@/lib/modules/payroll'
import { recordAudit } from '@/lib/modules/audit'

export const dynamic = 'force-dynamic'

function csvEscape(v: unknown): string {
  if (v == null) return ''
  const s = String(v)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const actor = await requirePermission('payroll:*')
  const { id } = await ctx.params

  const run = await getPayslipRun(id)
  if (!run) return new NextResponse('Run not found', { status: 404 })

  // GL-style export: one row per line item (gross + each deduction + net).
  // Useful for feeding into general-ledger / accounting systems.
  const periodLabel = `${run.periodStart.toISOString().slice(0, 10)}_${run.periodEnd.toISOString().slice(0, 10)}`

  const header = [
    'run_id',
    'period_start',
    'period_end',
    'run_status',
    'employee_code',
    'employee_name',
    'department',
    'line_type',
    'label',
    'amount',
    'currency',
  ]
  const lines: string[] = [header.join(',')]

  for (const p of run.payslips) {
    const base = [
      run.id,
      run.periodStart.toISOString().slice(0, 10),
      run.periodEnd.toISOString().slice(0, 10),
      run.status,
      p.employee.employeeCode,
      `${p.employee.firstName} ${p.employee.lastName}`,
      p.employee.department?.name ?? 'Unassigned',
    ]
    lines.push([...base, 'gross', 'Gross pay', p.grossPay.toFixed(2), 'USD'].map(csvEscape).join(','))
    for (const d of payslipDeductions(p.deductions)) {
      lines.push([...base, 'deduction', d.label, (-d.amount).toFixed(2), 'USD'].map(csvEscape).join(','))
    }
    lines.push([...base, 'net', 'Net pay', p.netPay.toFixed(2), 'USD'].map(csvEscape).join(','))
  }

  const body = lines.join('\n') + '\n'

  await recordAudit({
    userId: actor.id,
    action: 'payroll.exportCsv',
    entityType: 'PayslipRun',
    entityId: run.id,
    after: { rows: lines.length - 1 },
  })

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="payroll_${periodLabel}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
