import Link from 'next/link'
import {
  listPayslipRunsPaged,
  payrollDashboard,
} from '@/lib/modules/payroll'
import { Card, CardHeader, Stat } from '@/lib/ui/Card'
import { Table, THead, TR, TH, TD, Badge } from '@/lib/ui/Table'
import { DataTable, parseTableQuery, type Column } from '@/lib/ui/DataTable'
import { PageHeader } from '@/lib/ui/PageHeader'
import { NewRunForm } from './NewRunForm'

type SortField = 'periodStart' | 'createdAt' | 'status'
const SORT_FIELDS: ReadonlyArray<SortField> = ['periodStart', 'createdAt', 'status']
const STATUSES = ['draft', 'finalized']

function fmt(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default async function PayrollPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const query = parseTableQuery(params)
  const status = typeof params.status === 'string' ? params.status : undefined
  const sort = (SORT_FIELDS as readonly string[]).includes(query.sort ?? '')
    ? (query.sort as SortField)
    : undefined

  const [{ rows, total }, dash] = await Promise.all([
    listPayslipRunsPaged({
      q: query.q,
      status,
      sort,
      order: query.order,
      page: query.page,
      pageSize: query.pageSize,
    }),
    payrollDashboard(),
  ])
  const maxMonthlyGross = Math.max(...dash.byMonth.map((m) => m.gross), 0)

  type Row = (typeof rows)[number]

  const columns: Column<Row>[] = [
    {
      key: 'periodStart',
      header: 'Period',
      sortable: true,
      cell: (r) => (
        <Link href={`/admin/payroll/${r.id}`} className="font-medium hover:underline">
          {new Date(r.periodStart).toLocaleDateString()} –{' '}
          {new Date(r.periodEnd).toLocaleDateString()}
        </Link>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      cell: (r) => (
        <Badge tone={r.status === 'finalized' ? 'success' : 'warn'} dot>
          {r.status}
        </Badge>
      ),
    },
    {
      key: 'payslips',
      header: 'Payslips',
      cell: (r) => <span className="tabular-nums">{r._count.payslips}</span>,
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      cell: (r) => new Date(r.createdAt).toLocaleString(),
    },
    {
      key: 'actions',
      header: '',
      cell: (r) => (
        <div className="flex gap-3 text-sm">
          <Link href={`/admin/payroll/${r.id}`} className="text-accent hover:underline">
            Open
          </Link>
          <a href={`/admin/payroll/${r.id}/export.csv`} className="text-accent hover:underline">
            CSV
          </a>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Payroll" description="Payslip runs, totals, and per-department breakdown." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Total runs" value={dash.totalRuns} hint={`${dash.finalizedRuns} finalized · ${dash.draftRuns} draft`} />
        <Stat label="Gross to date" value={fmt(dash.totalGross)} hint={dash.baseCurrency} />
        <Stat label="Net to date" value={fmt(dash.totalNet)} hint={dash.baseCurrency} />
        <Stat label="Latest run gross" value={dash.latestRun ? fmt(dash.latestRun.gross) : '—'} hint={dash.latestRun ? new Date(dash.latestRun.periodStart).toLocaleDateString() : 'no runs'} />
        <Stat label="Latest run net" value={dash.latestRun ? fmt(dash.latestRun.net) : '—'} hint={dash.latestRun ? `${dash.latestRun.payslips} payslips` : ''} />
      </div>

      {dash.missingRates.length > 0 && (
        <Card className="border-amber-500/40">
          <CardHeader
            title="Missing FX rates"
            subtitle={`${dash.missingRates.join(', ')} — totals fall back to native amounts. Set PAYROLL_FX_RATES to fix.`}
          />
        </Card>
      )}

      {dash.byCurrency.length > 1 && (
        <Card>
          <CardHeader title="By currency" subtitle={`All amounts converted to ${dash.baseCurrency}`} />
          <Table>
            <THead>
              <TR><TH>Currency</TH><TH>Payslips</TH><TH>Native gross</TH><TH>Native net</TH><TH>Converted gross</TH><TH>Converted net</TH><TH>Rate</TH></TR>
            </THead>
            <tbody>
              {dash.byCurrency.map((c) => (
                <TR key={c.currency}>
                  <TD className="font-medium">{c.currency}</TD>
                  <TD className="tabular-nums">{c.count}</TD>
                  <TD className="tabular-nums">{fmt(c.nativeGross)}</TD>
                  <TD className="tabular-nums">{fmt(c.nativeNet)}</TD>
                  <TD className="tabular-nums">{fmt(c.convertedGross)}</TD>
                  <TD className="tabular-nums">{fmt(c.convertedNet)}</TD>
                  <TD className="tabular-nums text-xs text-foreground-muted">{c.rate === null ? '—' : c.rate.toFixed(4)}</TD>
                </TR>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Monthly gross trend" />
          {dash.byMonth.length === 0 ? (
            <p className="text-sm text-foreground-muted">No payroll data yet.</p>
          ) : (
            <div className="space-y-2">
              {dash.byMonth.map((m) => {
                const pct = maxMonthlyGross ? Math.round((m.gross / maxMonthlyGross) * 100) : 0
                return (
                  <div key={m.month} className="text-sm">
                    <div className="mb-1 flex justify-between">
                      <span className="font-mono">{m.month}</span>
                      <span className="font-semibold tabular-nums">{fmt(m.gross)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded bg-surface-muted">
                      <div className={`h-full bg-accent w-[${pct}%]`} />
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
          <Card>
            <CardHeader title="Payslip runs" subtitle={`${total} total`} />
            <DataTable
              rows={rows}
              columns={columns}
              query={query}
              total={total}
              basePath="/admin/payroll"
              rowKey={(r) => r.id}
              emptyMessage="No payroll runs match your filters."
              toolbar={{
                searchPlaceholder: 'Search status…',
                filters: [
                  {
                    name: 'status',
                    label: 'Status',
                    options: STATUSES.map((s) => ({ label: s, value: s })),
                  },
                ],
              }}
            />
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
