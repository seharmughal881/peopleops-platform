import { requireUser } from '@/lib/modules/auth'
import { redirect } from 'next/navigation'
import { summarize } from '@/lib/modules/finance'
import { hasPermission } from '@/lib/modules/auth/rbac'
import { Card, CardHeader, Stat } from '@/lib/ui/Card'
import { Table, THead, TR, TH, TD } from '@/lib/ui/Table'
import { ExportForms } from './ExportForms'

function firstOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}
function lastOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

export default async function AdminFinancePage() {
  const user = await requireUser()
  const canExpense = hasPermission(user.permissions, 'expense:*')
  const canPayroll = hasPermission(user.permissions, 'payroll:*')
  if (!canExpense && !canPayroll) redirect('/admin')

  const from = firstOfMonth()
  const to = lastOfMonth()
  const { expenseCount, payslipCount, mapping } = await summarize({ from, to })

  const fromStr = from.toISOString().slice(0, 10)
  const toStr = to.toISOString().slice(0, 10)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Finance export</h1>
        <p className="text-sm text-foreground-muted">
          Download GL-ready CSVs for upload to QuickBooks, Xero, or any chart-of-accounts–driven system.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Stat label="Reimbursed expenses (this month)" value={expenseCount} hint={`${fromStr} → ${toStr}`} />
        <Stat label="Finalized payslips (this month)" value={payslipCount} hint={`${fromStr} → ${toStr}`} />
      </div>

      <Card>
        <CardHeader title="Export" subtitle="Picks any range; defaults shown are the current month." />
        <ExportForms
          defaults={{ from: fromStr, to: toStr }}
          canExpense={canExpense}
          canPayroll={canPayroll}
        />
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="GL mapping: Expenses" subtitle="Override via FINANCE_GL_MAP env var" />
          <Table>
            <THead>
              <TR><TH>Category</TH><TH>Account</TH><TH>Name</TH></TR>
            </THead>
            <tbody>
              {Object.entries(mapping.expense).map(([k, v]) => (
                <TR key={k}>
                  <TD>{k}</TD>
                  <TD className="font-mono">{v.account}</TD>
                  <TD>{v.name}</TD>
                </TR>
              ))}
            </tbody>
          </Table>
        </Card>
        <Card>
          <CardHeader title="GL mapping: Payroll" />
          <Table>
            <THead>
              <TR><TH>Line</TH><TH>Account</TH><TH>Name</TH></TR>
            </THead>
            <tbody>
              {Object.entries(mapping.payroll).map(([k, v]) => (
                <TR key={k}>
                  <TD>{k}</TD>
                  <TD className="font-mono">{v.account}</TD>
                  <TD>{v.name}</TD>
                </TR>
              ))}
            </tbody>
          </Table>
        </Card>
      </div>
    </div>
  )
}
