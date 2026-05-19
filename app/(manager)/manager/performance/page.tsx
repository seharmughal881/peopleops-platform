import { prisma } from '@/lib/db/client'
import { requireUser } from '@/lib/modules/auth'
import {
  teamGoals, teamActivePIPs, listCycles,
  suggestedCandidates, listPromotionsByManager,
} from '@/lib/modules/performance'
import { Card, CardHeader } from '@/lib/ui/Card'
import { Badge, Table, THead, TR, TH, TD } from '@/lib/ui/Table'
import { InitiateReviewForm } from './InitiateReviewForm'
import { NewPIPForm } from './NewPIPForm'
import { RecommendPromotionForm } from './RecommendPromotionForm'
import { WithdrawPromotionButton } from './WithdrawPromotionButton'

export default async function ManagerPerformancePage() {
  const user = await requireUser()
  if (!user.employee) return <Card>No employee record.</Card>

  const [goals, pips, cycles, reports, candidates, myPromos, departments] = await Promise.all([
    teamGoals(user.employee.id),
    teamActivePIPs(user.employee.id),
    listCycles(),
    prisma.employee.findMany({
      where: { managerId: user.employee.id },
      select: { id: true, firstName: true, lastName: true, employeeCode: true },
      orderBy: [{ lastName: 'asc' }],
    }),
    suggestedCandidates(user.employee.id),
    listPromotionsByManager(user.employee.id),
    prisma.department.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ])

  const activeCycles = cycles.filter((c) => c.status === 'active')

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Team goals" subtitle={`${goals.length} across ${reports.length} report${reports.length === 1 ? '' : 's'}`} />
        <Table>
          <THead>
            <TR><TH>Employee</TH><TH>Title</TH><TH>Type</TH><TH>Target</TH><TH>Progress</TH><TH>Status</TH></TR>
          </THead>
          <tbody>
            {goals.length === 0 && <TR><TD>No goals yet.</TD></TR>}
            {goals.map((g) => (
              <TR key={g.id}>
                <TD>{g.employee.firstName} {g.employee.lastName}</TD>
                <TD className="font-medium">{g.title}</TD>
                <TD><Badge>{g.type}</Badge></TD>
                <TD>{g.targetDate ? new Date(g.targetDate).toLocaleDateString() : '—'}</TD>
                <TD>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-20 overflow-hidden rounded bg-surface-muted">
                      <div className="h-full bg-accent" style={{ width: `${g.progress}%` }} />
                    </div>
                    <span className="text-xs">{g.progress}%</span>
                  </div>
                </TD>
                <TD><Badge tone={g.status === 'completed' ? 'success' : g.status === 'cancelled' ? 'neutral' : 'warn'}>{g.status}</Badge></TD>
              </TR>
            ))}
          </tbody>
        </Table>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Initiate review" subtitle="Active cycles only" />
          {activeCycles.length === 0 ? (
            <p className="text-sm text-foreground-muted">No active cycle. Ask HR to open one.</p>
          ) : reports.length === 0 ? (
            <p className="text-sm text-foreground-muted">You have no direct reports.</p>
          ) : (
            <InitiateReviewForm cycles={activeCycles} reports={reports} />
          )}
        </Card>

        <Card>
          <CardHeader title="Open a PIP" />
          {reports.length === 0 ? (
            <p className="text-sm text-foreground-muted">You have no direct reports.</p>
          ) : (
            <NewPIPForm reports={reports} />
          )}
        </Card>
      </div>

      <Card>
        <CardHeader title="Active PIPs on your team" subtitle={`${pips.length} active`} />
        <Table>
          <THead>
            <TR><TH>Employee</TH><TH>Period</TH><TH>Reason</TH><TH>Status</TH></TR>
          </THead>
          <tbody>
            {pips.length === 0 && <TR><TD>No active PIPs.</TD></TR>}
            {pips.map((p) => (
              <TR key={p.id}>
                <TD>{p.subject.firstName} {p.subject.lastName} ({p.subject.employeeCode})</TD>
                <TD>{new Date(p.startDate).toLocaleDateString()} – {new Date(p.endDate).toLocaleDateString()}</TD>
                <TD className="max-w-md truncate">{p.reason}</TD>
                <TD><Badge tone="warn">{p.status}</Badge></TD>
              </TR>
            ))}
          </tbody>
        </Table>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Suggested for promotion"
            subtitle="Direct reports with avg review rating ≥ 4.5 and no active PIP"
          />
          {candidates.length === 0 ? (
            <p className="text-sm text-foreground-muted">No suggested candidates yet — needs submitted reviews with ratings ≥ 4.5.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {candidates.map((c) => (
                <li key={c.employee.id} className="flex items-center justify-between rounded-md border border-border bg-surface-muted px-3 py-2">
                  <div>
                    <p className="font-medium">{c.employee.firstName} {c.employee.lastName}</p>
                    <p className="text-xs text-foreground-muted">{c.employee.jobTitle ?? '—'} · avg <span className="font-semibold">{c.avgRating?.toFixed(2)}</span> / 5 ({c.reviewCount} reviews)</p>
                  </div>
                  <Badge tone="success" dot>strong</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Recommend for promotion" subtitle="Sends to HR for decision" />
          {reports.length === 0 ? (
            <p className="text-sm text-foreground-muted">You have no direct reports.</p>
          ) : (
            <RecommendPromotionForm reports={reports} departments={departments} />
          )}
        </Card>
      </div>

      <Card>
        <CardHeader title="My promotion recommendations" subtitle={`${myPromos.length} total`} />
        <Table>
          <THead>
            <TR><TH>Employee</TH><TH>Proposed title</TH><TH>Proposed salary</TH><TH>Status</TH><TH>Submitted</TH><TH></TH></TR>
          </THead>
          <tbody>
            {myPromos.length === 0 && <TR><TD>None yet.</TD></TR>}
            {myPromos.map((p) => (
              <TR key={p.id}>
                <TD>{p.subject.firstName} {p.subject.lastName} ({p.subject.employeeCode})</TD>
                <TD className="font-medium">{p.proposedTitle}</TD>
                <TD>{p.proposedSalary != null ? `${p.proposedSalary.toFixed(2)} ${p.proposedCurrency}` : '—'}</TD>
                <TD>
                  <Badge tone={p.status === 'approved' ? 'success' : p.status === 'rejected' ? 'danger' : p.status === 'pending' ? 'warn' : 'neutral'}>
                    {p.status}
                  </Badge>
                </TD>
                <TD>{new Date(p.createdAt).toLocaleDateString()}</TD>
                <TD>{p.status === 'pending' && <WithdrawPromotionButton id={p.id} />}</TD>
              </TR>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  )
}
