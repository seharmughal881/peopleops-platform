import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/modules/auth'
import { listPlans, myEnrollments } from '@/lib/modules/benefits'
import { Card, CardHeader } from '@/lib/ui/Card'
import { Badge } from '@/lib/ui/Table'
import { PlanRow } from './PlanRow'
import { EnrollmentCard } from './EnrollmentCard'

export default async function BenefitsPage() {
  const user = await requireUser()
  if (!user.employee) redirect('/dashboard')

  const [plans, enrollments] = await Promise.all([
    listPlans({ activeOnly: true }),
    myEnrollments(user.employee.id),
  ])

  const activeOrPendingByPlan = new Map(
    enrollments
      .filter((e) => e.status === 'active' || e.status === 'pending')
      .map((e) => [e.planId, e]),
  )

  const myActive = enrollments.filter((e) => e.status === 'active')
  const myOther = enrollments.filter((e) => e.status !== 'active')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Benefits</h1>
        <p className="text-sm text-foreground-muted">Enroll in plans, manage dependents, and review your coverage.</p>
      </div>

      <Card>
        <CardHeader title="My active coverage" subtitle={`${myActive.length} active`} />
        {myActive.length === 0 ? (
          <p className="text-sm text-foreground-muted">No active enrollments. Pick a plan below to get started.</p>
        ) : (
          <div className="space-y-3">
            {myActive.map((e) => (
              <EnrollmentCard
                key={e.id}
                enrollment={{
                  id: e.id,
                  coverageLevel: e.coverageLevel,
                  effectiveFrom: e.effectiveFrom.toISOString(),
                  plan: {
                    name: e.plan.name,
                    type: e.plan.type,
                    monthlyPremium: Number(e.plan.monthlyPremium),
                    employerShare: Number(e.plan.employerShare),
                    coversDependents: e.plan.coversDependents,
                  },
                  dependents: e.dependents.map((d) => ({
                    id: d.id,
                    firstName: d.firstName,
                    lastName: d.lastName,
                    relation: d.relation,
                    dob: d.dob ? d.dob.toISOString() : null,
                  })),
                }}
              />
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Available plans" subtitle={`${plans.length} active plan${plans.length === 1 ? '' : 's'}`} />
        {plans.length === 0 ? (
          <p className="text-sm text-foreground-muted">No plans available yet.</p>
        ) : (
          <div className="space-y-3">
            {plans.map((p) => {
              const mine = activeOrPendingByPlan.get(p.id)
              return (
                <PlanRow
                  key={p.id}
                  plan={{
                    id: p.id,
                    name: p.name,
                    type: p.type,
                    description: p.description,
                    monthlyPremium: Number(p.monthlyPremium),
                    employerShare: Number(p.employerShare),
                    coversDependents: p.coversDependents,
                    enrollOpensAt: p.enrollOpensAt ? p.enrollOpensAt.toISOString() : null,
                    enrollClosesAt: p.enrollClosesAt ? p.enrollClosesAt.toISOString() : null,
                  }}
                  myStatus={mine?.status ?? null}
                />
              )
            })}
          </div>
        )}
      </Card>

      {myOther.length > 0 && (
        <Card>
          <CardHeader title="History" subtitle="Waivers and terminated enrollments" />
          <ul className="space-y-2 text-sm">
            {myOther.map((e) => (
              <li key={e.id} className="flex items-center justify-between rounded-md border border-border p-3">
                <span>
                  <span className="font-medium">{e.plan.name}</span>
                  <span className="ml-2 text-xs text-foreground-muted">{e.plan.type}</span>
                </span>
                <Badge tone="neutral">{e.status}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
