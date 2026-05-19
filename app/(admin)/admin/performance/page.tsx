import { listCycles, listAllPIPs, performanceKPIs, listAllPromotions } from '@/lib/modules/performance'
import { Card, CardHeader, Stat } from '@/lib/ui/Card'
import { Badge, Table, THead, TR, TH, TD } from '@/lib/ui/Table'
import { NewCycleForm } from './NewCycleForm'
import { CycleStatusButtons } from './CycleStatusButtons'
import { PromotionDecideForm } from './PromotionDecideForm'

export default async function AdminPerformancePage() {
  const [cycles, pips, kpis, promotions] = await Promise.all([
    listCycles(),
    listAllPIPs(),
    performanceKPIs(),
    listAllPromotions(),
  ])
  const pendingPromotions = promotions.filter((p) => p.status === 'pending')
  const decidedPromotions = promotions.filter((p) => p.status !== 'pending')

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Active goals" value={kpis.goalsActive} />
        <Stat label="Completed goals" value={kpis.goalsCompleted} />
        <Stat label="Cancelled goals" value={kpis.goalsCancelled} />
        <Stat label="Active cycles" value={kpis.activeCycles} />
        <Stat label="Active PIPs" value={kpis.pipsActive} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader title="Review cycles" />
            <Table>
              <THead>
                <TR><TH>Name</TH><TH>Period</TH><TH>Status</TH><TH>Reviews</TH><TH></TH></TR>
              </THead>
              <tbody>
                {cycles.length === 0 && <TR><TD>No cycles yet.</TD></TR>}
                {cycles.map((c) => (
                  <TR key={c.id}>
                    <TD className="font-medium">{c.name}</TD>
                    <TD>{new Date(c.startDate).toLocaleDateString()} – {new Date(c.endDate).toLocaleDateString()}</TD>
                    <TD>
                      <Badge tone={c.status === 'active' ? 'success' : c.status === 'closed' ? 'neutral' : 'warn'}>{c.status}</Badge>
                    </TD>
                    <TD>{c._count.reviews}</TD>
                    <TD><CycleStatusButtons id={c.id} status={c.status} /></TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          </Card>
        </div>
        <div>
          <Card>
            <CardHeader title="New cycle" subtitle="Starts as draft. Activate to allow managers to initiate reviews." />
            <NewCycleForm />
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader title="All PIPs" />
        <Table>
          <THead>
            <TR><TH>Subject</TH><TH>Manager</TH><TH>Period</TH><TH>Reason</TH><TH>Status</TH></TR>
          </THead>
          <tbody>
            {pips.length === 0 && <TR><TD>No PIPs.</TD></TR>}
            {pips.map((p) => (
              <TR key={p.id}>
                <TD>{p.subject.firstName} {p.subject.lastName} ({p.subject.employeeCode})</TD>
                <TD>{p.manager.firstName} {p.manager.lastName}</TD>
                <TD>{new Date(p.startDate).toLocaleDateString()} – {new Date(p.endDate).toLocaleDateString()}</TD>
                <TD className="max-w-md truncate">{p.reason}</TD>
                <TD>
                  <Badge tone={p.status === 'active' ? 'warn' : p.status === 'passed' ? 'success' : 'danger'}>{p.status}</Badge>
                </TD>
              </TR>
            ))}
          </tbody>
        </Table>
      </Card>

      <Card>
        <CardHeader title="Pending promotion recommendations" subtitle={`${pendingPromotions.length} awaiting decision`} />
        <Table>
          <THead>
            <TR><TH>Subject</TH><TH>Recommended by</TH><TH>Proposed title</TH><TH>Salary</TH><TH>Department</TH><TH>Justification</TH><TH>Decide</TH></TR>
          </THead>
          <tbody>
            {pendingPromotions.length === 0 && <TR><TD>No pending recommendations.</TD></TR>}
            {pendingPromotions.map((p) => (
              <TR key={p.id}>
                <TD>{p.subject.firstName} {p.subject.lastName} <span className="text-foreground-muted text-xs">({p.subject.employeeCode})</span><br/><span className="text-foreground-muted text-xs">Current: {p.subject.jobTitle ?? '—'}</span></TD>
                <TD>{p.recommendedBy.firstName} {p.recommendedBy.lastName}</TD>
                <TD className="font-medium">{p.proposedTitle}</TD>
                <TD>{p.proposedSalary != null ? `${p.proposedSalary.toFixed(2)} ${p.proposedCurrency}` : '—'}</TD>
                <TD>{p.department?.name ?? '—'}</TD>
                <TD className="max-w-md"><div className="whitespace-pre-wrap text-xs">{p.justification}</div></TD>
                <TD><PromotionDecideForm id={p.id} /></TD>
              </TR>
            ))}
          </tbody>
        </Table>
      </Card>

      <Card>
        <CardHeader title="Decided promotions" subtitle={`${decidedPromotions.length} total`} />
        <Table>
          <THead>
            <TR><TH>Subject</TH><TH>Proposed title</TH><TH>Status</TH><TH>Decided</TH><TH>Comments</TH></TR>
          </THead>
          <tbody>
            {decidedPromotions.length === 0 && <TR><TD>None yet.</TD></TR>}
            {decidedPromotions.map((p) => (
              <TR key={p.id}>
                <TD>{p.subject.firstName} {p.subject.lastName}</TD>
                <TD>{p.proposedTitle}</TD>
                <TD>
                  <Badge tone={p.status === 'approved' ? 'success' : p.status === 'rejected' ? 'danger' : 'neutral'}>{p.status}</Badge>
                </TD>
                <TD>{p.decidedAt ? new Date(p.decidedAt).toLocaleDateString() : '—'}</TD>
                <TD className="max-w-md truncate">{p.comments ?? '—'}</TD>
              </TR>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  )
}
