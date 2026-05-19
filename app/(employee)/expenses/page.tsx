import Link from 'next/link'
import { requireUser } from '@/lib/modules/auth'
import { myExpenses } from '@/lib/modules/expenses'
import { Card, CardHeader } from '@/lib/ui/Card'
import { Table, THead, TR, TH, TD, Badge } from '@/lib/ui/Table'
import { NewExpenseForm } from './NewExpenseForm'

function statusTone(s: string) {
  if (s === 'approved') return 'success' as const
  if (s === 'reimbursed') return 'success' as const
  if (s === 'rejected') return 'danger' as const
  if (s === 'submitted') return 'warn' as const
  return 'neutral' as const
}

export default async function ExpensesPage() {
  const user = await requireUser()
  if (!user.employee) return <Card>No employee record.</Card>

  const items = await myExpenses(user.employee.id)

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader title="My expenses" subtitle={`${items.length} total`} />
          <Table>
            <THead>
              <TR>
                <TH>Date</TH><TH>Category</TH><TH>Amount</TH><TH>Description</TH><TH>Receipts</TH><TH>Status</TH><TH></TH>
              </TR>
            </THead>
            <tbody>
              {items.length === 0 && <TR><TD>No expenses yet.</TD></TR>}
              {items.map((e) => (
                <TR key={e.id}>
                  <TD>{new Date(e.expenseDate).toLocaleDateString()}</TD>
                  <TD><Badge>{e.category}</Badge></TD>
                  <TD>{e.amount.toFixed(2)} {e.currency}</TD>
                  <TD className="max-w-[18rem] truncate">{e.description ?? '—'}</TD>
                  <TD>{e.receipts.length}</TD>
                  <TD><Badge tone={statusTone(e.status)}>{e.status}</Badge></TD>
                  <TD>
                    <Link href={`/expenses/${e.id}`} className="text-accent-deep hover:underline">Open</Link>
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        </Card>
      </div>
      <div>
        <Card>
          <CardHeader title="New expense" subtitle="Saves as draft — attach receipts then submit" />
          <NewExpenseForm />
        </Card>
      </div>
    </div>
  )
}
