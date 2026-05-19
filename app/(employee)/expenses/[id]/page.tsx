import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { requireUser } from '@/lib/modules/auth'
import { getExpense } from '@/lib/modules/expenses'
import { Card, CardHeader } from '@/lib/ui/Card'
import { Badge, Table, THead, TR, TH, TD } from '@/lib/ui/Table'
import { ExpenseActions } from './ExpenseActions'

export default async function ExpenseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireUser()
  const expense = await getExpense(id)
  if (!expense) notFound()
  if (!user.employee || expense.employeeId !== user.employee.id) redirect('/expenses')

  const canEdit = expense.status === 'draft'
  const canWithdraw = expense.status === 'draft' || expense.status === 'submitted'

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{expense.amount.toFixed(2)} {expense.currency}</h1>
          <p className="text-sm text-foreground-muted">
            {expense.category} · {new Date(expense.expenseDate).toLocaleDateString()} · <Badge tone={statusTone(expense.status)}>{expense.status}</Badge>
          </p>
        </div>
        <Link href="/expenses" className="text-sm text-foreground-muted hover:underline">← Back to expenses</Link>
      </div>

      {expense.description && (
        <Card>
          <CardHeader title="Description" />
          <p className="text-sm text-foreground">{expense.description}</p>
        </Card>
      )}

      <Card>
        <CardHeader
          title="Receipts"
          subtitle={canEdit ? 'Attach at least one before submitting' : `${expense.receipts.length} on file`}
        />
        <Table>
          <THead>
            <TR><TH>Name</TH><TH>Uploaded</TH><TH></TH></TR>
          </THead>
          <tbody>
            {expense.receipts.length === 0 && <TR><TD>No receipts yet.</TD></TR>}
            {expense.receipts.map((r) => (
              <TR key={r.id}>
                <TD>{r.name}</TD>
                <TD>{new Date(r.uploadedAt).toLocaleString()}</TD>
                <TD>
                  <Link href={`/api/files/${r.s3Key}`} target="_blank" className="text-accent-deep hover:underline">View</Link>
                </TD>
              </TR>
            ))}
          </tbody>
        </Table>
      </Card>

      <ExpenseActions
        expenseId={expense.id}
        canEdit={canEdit}
        canSubmit={canEdit && expense.receipts.length > 0}
        canWithdraw={canWithdraw}
      />
    </div>
  )
}

function statusTone(s: string) {
  if (s === 'approved' || s === 'reimbursed') return 'success' as const
  if (s === 'rejected') return 'danger' as const
  if (s === 'submitted') return 'warn' as const
  return 'neutral' as const
}
