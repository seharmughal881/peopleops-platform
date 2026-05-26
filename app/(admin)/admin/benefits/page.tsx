import Link from 'next/link'
import { listPlans, enrollmentSummary } from '@/lib/modules/benefits'
import { Card, CardHeader, Stat } from '@/lib/ui/Card'
import { Table, THead, TR, TH, TD, Badge } from '@/lib/ui/Table'
import { Button } from '@/lib/ui/Button'
import { NewPlanForm } from './NewPlanForm'
import { DeletePlanButton } from './DeletePlanButton'

export default async function AdminBenefitsPage() {
  const [plans, summary] = await Promise.all([listPlans(), enrollmentSummary()])
  const active = summary.find((s) => s.status === 'active')?.count ?? 0
  const waived = summary.find((s) => s.status === 'waived')?.count ?? 0
  const terminated = summary.find((s) => s.status === 'terminated')?.count ?? 0

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Plans" value={plans.length} />
        <Stat label="Active enrollments" value={active} />
        <Stat label="Waivers" value={waived} />
        <Stat label="Terminated" value={terminated} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader title="Benefit plans" subtitle={`${plans.length} total`} />
            <Table>
              <THead>
                <TR>
                  <TH>Name</TH>
                  <TH>Type</TH>
                  <TH>Premium (mo)</TH>
                  <TH>Employer share</TH>
                  <TH>Enrolled</TH>
                  <TH>Status</TH>
                  <TH>Actions</TH>
                </TR>
              </THead>
              <tbody>
                {plans.length === 0 && (
                  <TR><TD>No plans yet — create one to start.</TD></TR>
                )}
                {plans.map((p) => (
                  <TR key={p.id}>
                    <TD>
                      <Link href={`/admin/benefits/${p.id}`} className="font-medium hover:underline">
                        {p.name}
                      </Link>
                    </TD>
                    <TD>{p.type}</TD>
                    <TD>${Number(p.monthlyPremium).toFixed(2)}</TD>
                    <TD>${Number(p.employerShare).toFixed(2)}</TD>
                    <TD>{p._count.enrollments}</TD>
                    <TD>
                      <Badge tone={p.active ? 'success' : 'neutral'}>
                        {p.active ? 'active' : 'archived'}
                      </Badge>
                    </TD>
                    <TD>
                      <div className="flex items-start gap-2">
                        <Link href={`/admin/benefits/${p.id}`}>
                          <Button variant="outline" size="sm">Edit</Button>
                        </Link>
                        <DeletePlanButton
                          id={p.id}
                          name={p.name}
                          enrollments={p._count.enrollments}
                        />
                      </div>
                    </TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          </Card>
        </div>
        <div>
          <Card>
            <CardHeader title="New plan" />
            <NewPlanForm />
          </Card>
        </div>
      </div>
    </div>
  )
}
