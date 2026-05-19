import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getPlan } from '@/lib/modules/benefits'
import { Card, CardHeader } from '@/lib/ui/Card'
import { Table, THead, TR, TH, TD, Badge } from '@/lib/ui/Table'
import { EditPlanForm } from './EditPlanForm'
import { ArchivePlanButton } from './ArchivePlanButton'
import { AdminTerminateButton } from './AdminTerminateButton'

function fmtDate(d: Date | null | undefined) {
  return d ? new Date(d).toLocaleDateString() : '—'
}

export default async function PlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const plan = await getPlan(id)
  if (!plan) notFound()

  const activeCount = plan.enrollments.filter((e) => e.status === 'active').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-foreground-muted">
            <Link href="/admin/benefits" className="hover:underline">Benefits</Link> · {plan.type}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">{plan.name}</h1>
          <p className="text-sm text-foreground-muted">
            {activeCount} active enrollment{activeCount === 1 ? '' : 's'} ·{' '}
            <Badge tone={plan.active ? 'success' : 'neutral'}>{plan.active ? 'active' : 'archived'}</Badge>
          </p>
        </div>
        <ArchivePlanButton id={plan.id} active={plan.active} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader title="Enrollments" subtitle={`${plan.enrollments.length} total`} />
            <Table>
              <THead>
                <TR>
                  <TH>Employee</TH>
                  <TH>Coverage</TH>
                  <TH>Effective from</TH>
                  <TH>Dependents</TH>
                  <TH>Status</TH>
                  <TH></TH>
                </TR>
              </THead>
              <tbody>
                {plan.enrollments.length === 0 && (
                  <TR><TD>No enrollments yet.</TD></TR>
                )}
                {plan.enrollments.map((e) => (
                  <TR key={e.id}>
                    <TD className="font-medium">
                      {e.employee.firstName} {e.employee.lastName}
                      <span className="ml-1 text-xs text-foreground-muted">{e.employee.employeeCode}</span>
                    </TD>
                    <TD>{e.coverageLevel}</TD>
                    <TD>{fmtDate(e.effectiveFrom)}</TD>
                    <TD>{e.dependents.length}</TD>
                    <TD>
                      <Badge tone={e.status === 'active' ? 'success' : e.status === 'pending' ? 'warn' : 'neutral'}>
                        {e.status}
                      </Badge>
                    </TD>
                    <TD>
                      {e.status === 'active' && <AdminTerminateButton id={e.id} />}
                    </TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          </Card>
        </div>
        <div>
          <Card>
            <CardHeader title="Plan settings" />
            <EditPlanForm
              plan={{
                id: plan.id,
                name: plan.name,
                type: plan.type,
                description: plan.description ?? '',
                monthlyPremium: Number(plan.monthlyPremium),
                employerShare: Number(plan.employerShare),
                coversDependents: plan.coversDependents,
                enrollOpensAt: plan.enrollOpensAt ? new Date(plan.enrollOpensAt).toISOString().slice(0, 10) : '',
                enrollClosesAt: plan.enrollClosesAt ? new Date(plan.enrollClosesAt).toISOString().slice(0, 10) : '',
              }}
            />
          </Card>
        </div>
      </div>
    </div>
  )
}
