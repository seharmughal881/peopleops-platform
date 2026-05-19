import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayslipRun, payslipDeductions } from '@/lib/modules/payroll'
import { Card, CardHeader, Stat } from '@/lib/ui/Card'
import { Table, THead, TR, TH, TD, Badge } from '@/lib/ui/Table'
import { PageHeader } from '@/lib/ui/PageHeader'
import { Button } from '@/lib/ui/Button'

function fmt(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default async function PayrollRunDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const run = await getPayslipRun(id)
  if (!run) notFound()

  const totalGross = run.payslips.reduce((s, p) => s + p.grossPay, 0)
  const totalNet = run.payslips.reduce((s, p) => s + p.netPay, 0)
  const totalDeductions = totalGross - totalNet

  // Per-department totals
  const byDept = new Map<string, { gross: number; net: number; count: number }>()
  for (const p of run.payslips) {
    const dept = p.employee.department?.name ?? 'Unassigned'
    const cur = byDept.get(dept) ?? { gross: 0, net: 0, count: 0 }
    cur.gross += p.grossPay
    cur.net += p.netPay
    cur.count += 1
    byDept.set(dept, cur)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Payroll run · ${new Date(run.periodStart).toLocaleDateString()} – ${new Date(run.periodEnd).toLocaleDateString()}`}
        breadcrumbs={<Link href="/admin/payroll" className="hover:underline">← Payroll</Link>}
        actions={
          <div className="flex items-center gap-2">
            <Badge tone={run.status === 'finalized' ? 'success' : 'warn'} dot>{run.status}</Badge>
            <a href={`/admin/payroll/${run.id}/export.csv`} className="inline-block">
              <Button size="sm" variant="outline">Export CSV</Button>
            </a>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Payslips" value={run.payslips.length} />
        <Stat label="Total gross" value={fmt(totalGross)} hint="USD" />
        <Stat label="Total deductions" value={fmt(totalDeductions)} hint={`${totalGross ? ((totalDeductions / totalGross) * 100).toFixed(1) : '0.0'}%`} />
        <Stat label="Total net" value={fmt(totalNet)} hint="USD" />
      </div>

      <Card>
        <CardHeader title="By department" />
        <Table>
          <THead>
            <TR><TH>Department</TH><TH>Payslips</TH><TH>Gross</TH><TH>Net</TH></TR>
          </THead>
          <tbody>
            {Array.from(byDept.entries())
              .sort((a, b) => b[1].gross - a[1].gross)
              .map(([dept, v]) => (
                <TR key={dept}>
                  <TD className="font-medium">{dept}</TD>
                  <TD className="tabular-nums">{v.count}</TD>
                  <TD className="tabular-nums">{fmt(v.gross)}</TD>
                  <TD className="tabular-nums">{fmt(v.net)}</TD>
                </TR>
              ))}
          </tbody>
        </Table>
      </Card>

      <Card padding="none">
        <div className="px-5 pt-5">
          <CardHeader title="Line items" subtitle={`${run.payslips.length} payslips`} />
        </div>
        <Table>
          <THead>
            <TR>
              <TH>Employee</TH>
              <TH>Department</TH>
              <TH>Gross</TH>
              <TH>Deductions</TH>
              <TH>Net</TH>
            </TR>
          </THead>
          <tbody>
            {run.payslips.length === 0 && <TR><TD>No payslips in this run.</TD></TR>}
            {run.payslips.map((p) => {
              const lines = payslipDeductions(p.deductions)
              const ded = lines.reduce((s, l) => s + l.amount, 0)
              return (
                <TR key={p.id}>
                  <TD>
                    <p className="font-medium">{p.employee.firstName} {p.employee.lastName}</p>
                    <p className="text-xs text-foreground-muted">{p.employee.employeeCode}</p>
                  </TD>
                  <TD>{p.employee.department?.name ?? 'Unassigned'}</TD>
                  <TD className="tabular-nums">{fmt(p.grossPay)}</TD>
                  <TD className="tabular-nums">
                    {fmt(ded)}
                    {lines.length > 0 && (
                      <ul className="mt-1 text-[11px] text-foreground-muted">
                        {lines.map((l, i) => (
                          <li key={i}>{l.label}: {fmt(l.amount)}</li>
                        ))}
                      </ul>
                    )}
                  </TD>
                  <TD className="font-semibold tabular-nums">{fmt(p.netPay)}</TD>
                </TR>
              )
            })}
          </tbody>
        </Table>
      </Card>
    </div>
  )
}
