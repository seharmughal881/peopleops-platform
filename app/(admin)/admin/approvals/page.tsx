import { pendingLeaveApprovalsAll } from '@/lib/modules/leave'
import { pendingExpenseApprovalsAll } from '@/lib/modules/expenses'
import { pendingOvertimeApprovalsAll } from '@/lib/modules/overtime-entries'
import { Card, CardHeader, Stat } from '@/lib/ui/Card'
import { Table, THead, TR, TH, TD, Badge } from '@/lib/ui/Table'
import { LeaveDecideForm } from '../../../(manager)/manager/approvals/LeaveDecideForm'
import { ExpenseDecideForm } from '../../../(manager)/manager/approvals/ExpenseDecideForm'
import { OvertimeDecideForm } from '../../../(manager)/manager/approvals/OvertimeDecideForm'

export default async function AdminApprovalsPage() {
  const [leaveItems, expenseItems, overtimeItems] = await Promise.all([
    pendingLeaveApprovalsAll(),
    pendingExpenseApprovalsAll(),
    pendingOvertimeApprovalsAll(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Approvals</h1>
        <p className="text-sm text-foreground-muted">All pending approvals across the org.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Pending leave" value={leaveItems.length} />
        <Stat label="Pending expenses" value={expenseItems.length} />
        <Stat label="Pending extra hours" value={overtimeItems.length} />
      </div>

      <Card>
        <CardHeader title="Pending leave approvals" subtitle={`${leaveItems.length} total`} />
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
                <TD className="max-w-xs truncate">{request?.reason ?? '—'}</TD>
                <TD><LeaveDecideForm approvalId={approval.id} /></TD>
              </TR>
            ))}
          </tbody>
        </Table>
      </Card>

      <Card>
        <CardHeader title="Pending expense approvals" subtitle={`${expenseItems.length} total`} />
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
                <TD className="max-w-xs truncate">{expense?.description ?? '—'}</TD>
                <TD>{expense?.receipts.length ?? 0}</TD>
                <TD><ExpenseDecideForm approvalId={approval.id} /></TD>
              </TR>
            ))}
          </tbody>
        </Table>
      </Card>

      <Card>
        <CardHeader title="Pending extra-hours approvals" subtitle={`${overtimeItems.length} total`} />
        <Table>
          <THead>
            <TR>
              <TH>Employee</TH><TH>Work date</TH><TH>Hours</TH><TH>Reason</TH><TH>Submitted</TH><TH>Decision</TH>
            </TR>
          </THead>
          <tbody>
            {overtimeItems.length === 0 && <TR><TD>No pending extra-hours approvals.</TD></TR>}
            {overtimeItems.map(({ approval, entry }) => (
              <TR key={approval.id}>
                <TD>{entry ? `${entry.employee.firstName} ${entry.employee.lastName}` : '—'}</TD>
                <TD>{entry && new Date(entry.workDate).toLocaleDateString()}</TD>
                <TD>{entry && <Badge tone="info">{entry.hours.toFixed(2)}h</Badge>}</TD>
                <TD className="max-w-xs truncate">{entry?.reason ?? '—'}</TD>
                <TD>{entry && new Date(entry.createdAt).toLocaleDateString()}</TD>
                <TD><OvertimeDecideForm approvalId={approval.id} /></TD>
              </TR>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  )
}
