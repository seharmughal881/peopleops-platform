import { requireUser } from '@/lib/modules/auth'
import { myLeaveBalances, myLeaveRequests } from '@/lib/modules/leave'
import { Card, CardHeader } from '@/lib/ui/Card'
import { Table, THead, TR, TH, TD, Badge } from '@/lib/ui/Table'
import { LeaveForm } from './LeaveForm'

export default async function LeavePage() {
  const user = await requireUser()
  if (!user.employee) return <Card>No employee record.</Card>

  const [balances, requests] = await Promise.all([
    myLeaveBalances(user.employee.id),
    myLeaveRequests(user.employee.id),
  ])

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader title="My leave requests" />
          <Table>
            <THead>
              <TR>
                <TH>Type</TH>
                <TH>From</TH>
                <TH>To</TH>
                <TH>Days</TH>
                <TH>Status</TH>
              </TR>
            </THead>
            <tbody>
              {requests.length === 0 && (
                <TR><TD>No requests yet.</TD><TD></TD><TD></TD><TD></TD><TD></TD></TR>
              )}
              {requests.map((r) => (
                <TR key={r.id}>
                  <TD>{r.leaveType}</TD>
                  <TD>{new Date(r.startDate).toLocaleDateString()}</TD>
                  <TD>{new Date(r.endDate).toLocaleDateString()}</TD>
                  <TD>{r.days}</TD>
                  <TD>
                    <Badge tone={r.status === 'approved' ? 'success' : r.status === 'rejected' ? 'danger' : 'warn'}>
                      {r.status}
                    </Badge>
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader title="Balances" subtitle={`Year ${new Date().getFullYear()}`} />
          <ul className="space-y-2 text-sm">
            {balances.map((b) => (
              <li key={b.id} className="flex justify-between">
                <span className="capitalize">{b.leaveType}</span>
                <span className="font-semibold">{b.balance} days</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Submit request" />
          <LeaveForm />
        </Card>
      </div>
    </div>
  )
}
