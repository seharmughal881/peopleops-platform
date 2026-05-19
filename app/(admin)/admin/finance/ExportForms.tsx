'use client'

import { useState } from 'react'
import { Field, Input } from '@/lib/ui/Input'
import { Button } from '@/lib/ui/Button'

export function ExportForms({
  defaults,
  canExpense,
  canPayroll,
}: {
  defaults: { from: string; to: string }
  canExpense: boolean
  canPayroll: boolean
}) {
  const [from, setFrom] = useState(defaults.from)
  const [to, setTo] = useState(defaults.to)
  const [includeApproved, setIncludeApproved] = useState(false)

  const expenseUrl = `/api/admin/finance/expenses.csv?from=${from}&to=${to}${includeApproved ? '&include_approved=1' : ''}`
  const payrollUrl = `/api/admin/finance/payroll.csv?from=${from}&to=${to}`

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="From">
          <Input type="date" value={from} onChange={(e) => setFrom(e.currentTarget.value)} />
        </Field>
        <Field label="To">
          <Input type="date" value={to} onChange={(e) => setTo(e.currentTarget.value)} />
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
        {canExpense && (
          <>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeApproved}
                onChange={(e) => setIncludeApproved(e.currentTarget.checked)}
              />
              Include <span className="font-mono">approved</span> (not yet reimbursed)
            </label>
            <a href={expenseUrl} download>
              <Button variant="primary">Download expenses.csv</Button>
            </a>
          </>
        )}
        {canPayroll && (
          <a href={payrollUrl} download>
            <Button variant="outline">Download payroll.csv</Button>
          </a>
        )}
      </div>

      <p className="text-xs text-foreground-muted">
        Each download is audit-logged with the actor, row count, and date range.
      </p>
    </div>
  )
}
