import { requireUser } from '@/lib/modules/auth'
import { listMyKpis } from '@/lib/modules/performance/kpi'
import { Card, CardHeader } from '@/lib/ui/Card'
import { Table, THead, TR, TH, TD, Badge } from '@/lib/ui/Table'
import { PageHeader } from '@/lib/ui/PageHeader'
import { UpdateActualForm } from './UpdateActualForm'

export default async function MyKpiPage() {
  const user = await requireUser()
  if (!user.employee) return <Card><p>No employee record.</p></Card>
  const kpis = await listMyKpis(user.employee.id)

  return (
    <div className="space-y-6">
      <PageHeader title="My KPIs" description="Track your key performance indicators and update progress." />

      <Card>
        <CardHeader title="Indicators" subtitle={`${kpis.length} total`} />
        <Table>
          <THead>
            <TR><TH>KPI</TH><TH>Period</TH><TH>Target</TH><TH>Actual</TH><TH>Progress</TH><TH>Status</TH><TH></TH></TR>
          </THead>
          <tbody>
            {kpis.length === 0 && <TR><TD>No KPIs assigned yet.</TD></TR>}
            {kpis.map((k) => {
              const pct = k.target === 0 ? 0 : Math.round((k.actual / k.target) * 100)
              const tone = k.status === 'closed' ? 'neutral' : pct >= 100 ? 'success' : pct >= 60 ? 'info' : 'warn'
              return (
                <TR key={k.id}>
                  <TD className="font-medium">
                    {k.name}
                    {k.description && <div className="text-xs text-foreground-muted">{k.description}</div>}
                  </TD>
                  <TD>{k.period}</TD>
                  <TD>{k.target}{k.unit ? ` ${k.unit}` : ''}</TD>
                  <TD>{k.actual}{k.unit ? ` ${k.unit}` : ''}</TD>
                  <TD><Badge tone={tone}>{pct}%</Badge></TD>
                  <TD>{k.status}</TD>
                  <TD>{k.status === 'active' && <UpdateActualForm id={k.id} current={k.actual} />}</TD>
                </TR>
              )
            })}
          </tbody>
        </Table>
      </Card>
    </div>
  )
}
