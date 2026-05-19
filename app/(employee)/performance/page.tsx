import Link from 'next/link'
import { requireUser } from '@/lib/modules/auth'
import {
  myGoals, myReviewsToWrite, myReviewsAboutMe, myActivePIP, parsePIPGoals,
  myPendingPromotion,
} from '@/lib/modules/performance'
import { Card, CardHeader } from '@/lib/ui/Card'
import { Badge, Table, THead, TR, TH, TD } from '@/lib/ui/Table'
import { NewGoalForm } from './NewGoalForm'
import { GoalProgressForm } from './GoalProgressForm'

export default async function PerformancePage() {
  const user = await requireUser()
  if (!user.employee) return <Card>No employee record.</Card>

  const [goals, toWrite, aboutMe, pip, promo] = await Promise.all([
    myGoals(user.employee.id),
    myReviewsToWrite(user.employee.id),
    myReviewsAboutMe(user.employee.id),
    myActivePIP(user.employee.id),
    myPendingPromotion(user.employee.id),
  ])

  return (
    <div className="space-y-6">
      {promo && (
        <Card className="border-emerald-500/40">
          <CardHeader
            title={`You've been recommended for promotion: ${promo.proposedTitle}`}
            subtitle={`Submitted by ${promo.recommendedBy.firstName} ${promo.recommendedBy.lastName} — awaiting HR decision`}
            action={<Badge tone="warn" dot>pending HR</Badge>}
          />
        </Card>
      )}
      {pip && (
        <Card className="border-amber-500/40">
          <CardHeader title="Active Performance Improvement Plan" subtitle={`Managed by ${pip.manager.firstName} ${pip.manager.lastName}`} />
          <div className="space-y-2 text-sm">
            <p><span className="text-foreground-muted">Period:</span> {new Date(pip.startDate).toLocaleDateString()} – {new Date(pip.endDate).toLocaleDateString()}</p>
            <p><span className="text-foreground-muted">Reason:</span> {pip.reason}</p>
            <div>
              <p className="text-foreground-muted">Goals:</p>
              <ul className="mt-1 list-disc pl-5">
                {parsePIPGoals(pip.goals).map((g, i) => (
                  <li key={i}>
                    {g.title} {g.dueDate && <span className="text-foreground-muted">(due {g.dueDate})</span>}
                    <Badge tone={g.status === 'met' ? 'success' : g.status === 'missed' ? 'danger' : 'warn'}>{g.status}</Badge>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader title="My goals" subtitle={`${goals.length} total`} />
            <Table>
              <THead>
                <TR><TH>Title</TH><TH>Type</TH><TH>Target</TH><TH>Progress</TH><TH>Status</TH><TH></TH></TR>
              </THead>
              <tbody>
                {goals.length === 0 && <TR><TD>No goals yet.</TD></TR>}
                {goals.map((g) => (
                  <TR key={g.id}>
                    <TD className="font-medium">{g.title}</TD>
                    <TD><Badge>{g.type}</Badge></TD>
                    <TD>{g.targetDate ? new Date(g.targetDate).toLocaleDateString() : '—'}</TD>
                    <TD>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded bg-surface-muted">
                          <div className="h-full bg-accent" style={{ width: `${g.progress}%` }} />
                        </div>
                        <span>{g.progress}%</span>
                      </div>
                    </TD>
                    <TD><Badge tone={g.status === 'completed' ? 'success' : g.status === 'cancelled' ? 'neutral' : 'warn'}>{g.status}</Badge></TD>
                    <TD>{g.status === 'active' && <GoalProgressForm id={g.id} initial={g.progress} />}</TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          </Card>
        </div>
        <div>
          <Card>
            <CardHeader title="New goal" />
            <NewGoalForm employeeId={user.employee.id} />
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader title="Reviews to write" subtitle={`${toWrite.length} pending`} />
        <Table>
          <THead>
            <TR><TH>Cycle</TH><TH>Subject</TH><TH>Type</TH><TH>Closes</TH><TH></TH></TR>
          </THead>
          <tbody>
            {toWrite.length === 0 && <TR><TD>None — you're all caught up.</TD></TR>}
            {toWrite.map((r) => (
              <TR key={r.id}>
                <TD>{r.cycle.name}</TD>
                <TD>{r.subject.firstName} {r.subject.lastName} ({r.subject.employeeCode})</TD>
                <TD><Badge>{r.type}</Badge></TD>
                <TD>{new Date(r.cycle.endDate).toLocaleDateString()}</TD>
                <TD><Link href={`/performance/review/${r.id}`} className="text-accent-deep hover:underline">Open</Link></TD>
              </TR>
            ))}
          </tbody>
        </Table>
      </Card>

      <Card>
        <CardHeader title="Reviews about me" subtitle={`${aboutMe.length} submitted`} />
        <Table>
          <THead>
            <TR><TH>Cycle</TH><TH>Reviewer</TH><TH>Type</TH><TH>Rating</TH><TH>Submitted</TH></TR>
          </THead>
          <tbody>
            {aboutMe.length === 0 && <TR><TD>No reviews about you yet.</TD></TR>}
            {aboutMe.map((r) => (
              <TR key={r.id}>
                <TD>{r.cycle.name}</TD>
                <TD>{r.reviewer.firstName} {r.reviewer.lastName}</TD>
                <TD><Badge>{r.type}</Badge></TD>
                <TD>{r.rating ?? '—'} / 5</TD>
                <TD>{r.submittedAt && new Date(r.submittedAt).toLocaleDateString()}</TD>
              </TR>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  )
}
