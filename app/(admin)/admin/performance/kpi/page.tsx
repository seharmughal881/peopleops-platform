import { prisma } from '@/lib/db/client'
import { listKpisForReport } from '@/lib/modules/performance/kpi'
import { Card, CardHeader } from '@/lib/ui/Card'
import { Table, THead, TR, TH, TD, Badge } from '@/lib/ui/Table'
import { PageHeader } from '@/lib/ui/PageHeader'
import { CreateKpiForm } from './CreateKpiForm'
import { CloseKpiButton } from './CloseKpiButton'

export default async function AdminKpiPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const sp = await searchParams
  const [kpis, employees] = await Promise.all([
    listKpisForReport({ period: sp.period }),
    prisma.employee.findMany({
      where: { status: 'active' },
      select: { id: true, firstName: true, lastName: true, employeeCode: true },
      orderBy: [{ lastName: 'asc' }],
    }),
  ])

  return (
    <div className="space-y-6">
      <PageHeader
        title="KPIs"
        description="Manage organisation-wide key performance indicators."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader title="All KPIs" subtitle={`${kpis.length} tracked${sp.period ? ` for ${sp.period}` : ''}`} />
            <Table>
              <THead>
                <TR><TH>Employee</TH><TH>KPI</TH><TH>Period</TH><TH>Target</TH><TH>Actual</TH><TH>Progress</TH><TH>Status</TH><TH></TH></TR>
              </THead>
              <tbody>
                {kpis.length === 0 && <TR><TD>No KPIs yet.</TD></TR>}
                {kpis.map((k) => {
                  const pct = k.target === 0 ? 0 : Math.round((k.actual / k.target) * 100)
                  const tone = k.status === 'closed' ? 'neutral' : pct >= 100 ? 'success' : pct >= 60 ? 'info' : 'warn'
                  return (
                    <TR key={k.id}>
                      <TD>{k.employee.firstName} {k.employee.lastName}<span className="ml-1 text-xs text-foreground-muted">({k.employee.employeeCode})</span></TD>
                      <TD className="font-medium">{k.name}</TD>
                      <TD>{k.period}</TD>
                      <TD>{k.target}{k.unit ? ` ${k.unit}` : ''}</TD>
                      <TD>{k.actual}{k.unit ? ` ${k.unit}` : ''}</TD>
                      <TD><Badge tone={tone}>{pct}%</Badge></TD>
                      <TD>{k.status}</TD>
                      <TD>{k.status === 'active' && <CloseKpiButton id={k.id} />}</TD>
                    </TR>
                  )
                })}
              </tbody>
            </Table>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader title="New KPI" />
            <CreateKpiForm employees={employees} />
          </Card>
        </div>
      </div>
    </div>
  )
}
