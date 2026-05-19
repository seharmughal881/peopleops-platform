import Link from 'next/link'
import { listAllExpenses, summary } from '@/lib/modules/expenses'
import { Card, CardHeader, Stat } from '@/lib/ui/Card'
import { Table, THead, TR, TH, TD, Badge } from '@/lib/ui/Table'
import { ReimburseButton } from './ReimburseButton'

function statusTone(s: string) {
  if (s === 'approved' || s === 'reimbursed') return 'success' as const
  if (s === 'rejected') return 'danger' as const
  if (s === 'submitted') return 'warn' as const
  return 'neutral' as const
}

export default async function AdminExpensesPage() {
  const [items, sum] = await Promise.all([listAllExpenses(), summary()])

  const stats = new Map(sum.map((s) => [s.status, s]))
  const submitted = stats.get('submitted')
  const approved = stats.get('approved')
  const reimbursed = stats.get('reimbursed')

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total" value={items.length} />
        <Stat label="Pending approval" value={submitted?.count ?? 0} hint={`${(submitted?.total ?? 0).toFixed(2)} pending`} />
        <Stat label="Awaiting reimbursement" value={approved?.count ?? 0} hint={`${(approved?.total ?? 0).toFixed(2)} owed`} />
        <Stat label="Reimbursed YTD" value={reimbursed?.count ?? 0} hint={`${(reimbursed?.total ?? 0).toFixed(2)} paid`} />
      </div>

      <Card>
        <CardHeader title="All expenses" subtitle="Most recent 200" />
        <Table>
          <THead>
            <TR>
              <TH>Date</TH><TH>Employee</TH><TH>Category</TH><TH>Amount</TH><TH>Receipts</TH><TH>Status</TH><TH></TH>
            </TR>
          </THead>
          <tbody>
            {items.length === 0 && <TR><TD>No expenses yet.</TD></TR>}
            {items.map((e) => (
              <TR key={e.id}>
                <TD>{new Date(e.expenseDate).toLocaleDateString()}</TD>
                <TD>{e.employee.firstName} {e.employee.lastName} ({e.employee.employeeCode})</TD>
                <TD><Badge>{e.category}</Badge></TD>
                <TD>{e.amount.toFixed(2)} {e.currency}</TD>
                <TD>{e.receipts.length}</TD>
                <TD><Badge tone={statusTone(e.status)}>{e.status}</Badge></TD>
                <TD>
                  {e.status === 'approved' && <ReimburseButton id={e.id} />}
                </TD>
              </TR>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  )
}
