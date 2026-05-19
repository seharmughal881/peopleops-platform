import Link from 'next/link'
import { listPayslipRuns, payrollDashboard } from '@/lib/modules/payroll'
import { Card, CardHeader, Stat } from '@/lib/ui/Card'
import { Table, THead, TR, TH, TD, Badge } from '@/lib/ui/Table'
import { PageHeader } from '@/lib/ui/PageHeader'
import { EmptyState } from '@/lib/ui/EmptyState'
import { NewRunForm } from './NewRunForm'

function fmt(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default async function PayrollPage() {
  const [runs, dash] = await Promise.all([listPayslipRuns(), payrollDashboard()])
  const maxMonthlyGross = Math.max(...dash.byMonth.map((m) => m.gross), 0)

  return (
    <div className="space-y-6">
      <PageHeader title="Payroll" description="Payslip runs, totals, and per-department breakdown." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Total runs" value={dash.totalRuns} hint={`${dash.finalizedRuns} finalized · ${dash.draftRuns} draft`} />
        <Stat label="Gross to date" value={fmt(dash.totalGross)} hint="USD" />
        <Stat label="Net to date" value={fmt(dash.totalNet)} hint="USD" />
        <Stat label="Latest run gross" value={dash.latestRun ? fmt(dash.latestRun.gross) : '—'} hint={dash.latestRun ? new Date(dash.latestRun.periodStart).toLocaleDateString() : 'no runs'} />
        <Stat label="Latest run net" value={dash.latestRun ? fmt(dash.latestRun.net) : '—'} hint={dash.latestRun ? `${dash.latestRun.payslips} payslips` : ''} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Monthly gross trend" />
          {dash.byMonth.length === 0 ? (
            <p className="text-sm text-foreground-muted">No payroll data yet.</p>
          ) : (
            <div className="space-y-2">
              {dash.byMonth.map((m) => {
                const pct = maxMonthlyGross ? (m.gross / maxMonthlyGross) * 100 : 0
                return (
                  <div key={m.month} className="text-sm">
                    <div className="mb-1 flex justify-between">
                      <span className="font-mono">{m.month}</span>
                      <span className="font-semibold tabular-nums">{fmt(m.gross)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded bg-surface-muted">
                      <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="By department" />
          {dash.byDepartment.length === 0 ? (
            <p className="text-sm text-foreground-muted">No data.</p>
          ) : (
            <Table>
              <THead>
                <TR><TH>Department</TH><TH>Payslips</TH><TH>Gross</TH><TH>Net</TH></TR>
              </THead>
              <tbody>
                {dash.byDepartment.map((d) => (
                  <TR key={d.department}>
                    <TD className="font-medium">{d.department}</TD>
                    <TD className="tabular-nums">{d.count}</TD>
                    <TD className="tabular-nums">{fmt(d.gross)}</TD>
                    <TD className="tabular-nums">{fmt(d.net)}</TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card padding="none">
            <div className="px-5 pt-5">
              <CardHeader title="Payslip runs" subtitle={`${runs.length} total`} />
            </div>
            {runs.length === 0 ? (
              <div className="px-5 pb-5"><EmptyState title="No runs yet" description="Generate the first payslip run on the right." /></div>
            ) : (
              <Table>
                <THead>
                  <TR><TH>Period</TH><TH>Status</TH><TH>Payslips</TH><TH>Created</TH><TH></TH></TR>
                </THead>
                <tbody>
                  {runs.map((r) => (
                    <TR key={r.id}>
                      <TD className="font-medium">
                        <Link href={`/admin/payroll/${r.id}`} className="hover:underline">
                          {new Date(r.periodStart).toLocaleDateString()} – {new Date(r.periodEnd).toLocaleDateString()}
                        </Link>
                      </TD>
                      <TD><Badge tone={r.status === 'finalized' ? 'success' : 'warn'} dot>{r.status}</Badge></TD>
                      <TD className="tabular-nums">{r._count.payslips}</TD>
                      <TD>{new Date(r.createdAt).toLocaleString()}</TD>
                      <TD>
                        <div className="flex gap-3 text-sm">
                          <Link href={`/admin/payroll/${r.id}`} className="text-accent hover:underline">Open</Link>
                          <a href={`/admin/payroll/${r.id}/export.csv`} className="text-accent hover:underline">CSV</a>
                        </div>
                      </TD>
                    </TR>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </div>
        <div>
          <Card>
            <CardHeader title="New payslip run" subtitle="Generates a payslip for every active employee" />
            <NewRunForm />
          </Card>
        </div>
      </div>
    </div>
  )
}
