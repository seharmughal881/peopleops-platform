import { requireUser } from '@/lib/modules/auth'
import { pendingLeaveApprovalsFor } from '@/lib/modules/leave'
import { pendingExpenseApprovalsFor } from '@/lib/modules/expenses'
import { Card, CardHeader } from '@/lib/ui/Card'
import { Table, THead, TR, TH, TD, Badge } from '@/lib/ui/Table'
import { LeaveDecideForm } from './LeaveDecideForm'
import { ExpenseDecideForm } from './ExpenseDecideForm'

export default async function ApprovalsPage() {
  const user = await requireUser()
  const [leaveItems, expenseItems] = await Promise.all([
    pendingLeaveApprovalsFor(user.id),
    pendingExpenseApprovalsFor(user.id),
  ])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Pending leave approvals" subtitle={`${leaveItems.length} awaiting your decision`} />
        <Table>
          <THead>
            <TR>
              <TH>Employee</TH><TH>Type</TH><TH>Dates</TH><TH>Days</TH><TH>Reason</TH><TH>Decision</TH>
            </TR>
          </THead>
          <tbody>
            {leaveItems.length === 0 && <TR><TD>No pending leave approvals.</TD></TR>}
            {leaveItems.map(({ approval, request }) => (
              <TR key={approval.id}>
                <TD>{request ? `${request.employee.firstName} ${request.employee.lastName}` : '—'}</TD>
                <TD><Badge tone="info">{request?.leaveType}</Badge></TD>
                <TD>
                  {request && (
                    <>{new Date(request.startDate).toLocaleDateString()} – {new Date(request.endDate).toLocaleDateString()}</>
                  )}
                </TD>
                <TD>{request?.days}</TD>
                <TD>{request?.reason ?? '—'}</TD>
                <TD><LeaveDecideForm approvalId={approval.id} /></TD>
              </TR>
            ))}
          </tbody>
        </Table>
      </Card>

      <Card>
        <CardHeader title="Pending expense approvals" subtitle={`${expenseItems.length} awaiting your decision`} />
        <Table>
          <THead>
            <TR>
              <TH>Employee</TH><TH>Category</TH><TH>Amount</TH><TH>Date</TH><TH>Description</TH><TH>Receipts</TH><TH>Decision</TH>
            </TR>
          </THead>
          <tbody>
            {expenseItems.length === 0 && <TR><TD>No pending expense approvals.</TD></TR>}
            {expenseItems.map(({ approval, expense }) => (
              <TR key={approval.id}>
                <TD>{expense ? `${expense.employee.firstName} ${expense.employee.lastName}` : '—'}</TD>
                <TD><Badge tone="info">{expense?.category}</Badge></TD>
                <TD>{expense ? `${expense.amount.toFixed(2)} ${expense.currency}` : '—'}</TD>
                <TD>{expense && new Date(expense.expenseDate).toLocaleDateString()}</TD>
                <TD>{expense?.description ?? '—'}</TD>
                <TD>{expense?.receipts.length ?? 0}</TD>
                <TD><ExpenseDecideForm approvalId={approval.id} /></TD>
              </TR>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  )
}
