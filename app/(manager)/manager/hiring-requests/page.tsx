import { requireUser } from '@/lib/modules/auth'
import { prisma } from '@/lib/db/client'
import { listMyHiringRequests } from '@/lib/modules/recruitment/hiring-requests'
import { Card, CardHeader } from '@/lib/ui/Card'
import { Table, THead, TR, TH, TD, Badge } from '@/lib/ui/Table'
import { PageHeader } from '@/lib/ui/PageHeader'
import { NewHiringRequestForm } from './NewHiringRequestForm'
import { WithdrawButton } from './WithdrawButton'

export default async function ManagerHiringRequestsPage() {
  const user = await requireUser()
  if (!user.employee) return <Card><p>No employee record.</p></Card>

  const [requests, departments] = await Promise.all([
    listMyHiringRequests(user.employee.id),
    prisma.department.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ])

  return (
    <div className="space-y-6">
      <PageHeader title="Hiring requests" description="Request new headcount for your team." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader title="My requests" subtitle={`${requests.length} submitted`} />
            <Table>
              <THead>
                <TR><TH>Title</TH><TH>Dept</TH><TH>Headcount</TH><TH>Urgency</TH><TH>Status</TH><TH>Created</TH><TH></TH></TR>
              </THead>
              <tbody>
                {requests.length === 0 && <TR><TD>No requests yet.</TD></TR>}
                {requests.map((r) => {
                  const tone = r.status === 'approved' ? 'success' : r.status === 'rejected' ? 'danger' : r.status === 'withdrawn' ? 'neutral' : 'warn'
                  return (
                    <TR key={r.id}>
                      <TD className="font-medium">{r.jobTitle}</TD>
                      <TD>{r.department?.name ?? '—'}</TD>
                      <TD>{r.headcount}</TD>
                      <TD>{r.urgency}</TD>
                      <TD><Badge tone={tone}>{r.status}</Badge></TD>
                      <TD className="text-xs text-foreground-muted">{new Date(r.createdAt).toLocaleDateString()}</TD>
                      <TD>{r.status === 'pending' && <WithdrawButton id={r.id} />}</TD>
                    </TR>
                  )
                })}
              </tbody>
            </Table>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader title="New request" />
            <NewHiringRequestForm departments={departments} />
          </Card>
        </div>
      </div>
    </div>
  )
}
