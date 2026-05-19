'use client'

import { useTransition } from 'react'
import { decideExpense } from '@/lib/modules/expenses/actions'
import { Button } from '@/lib/ui/Button'

export function ExpenseDecideForm({ approvalId }: { approvalId: string }) {
  const [pending, startTransition] = useTransition()

  function decide(decision: 'approved' | 'rejected') {
    const fd = new FormData()
    fd.set('approvalId', approvalId)
    fd.set('decision', decision)
    startTransition(async () => {
      await decideExpense(fd)
    })
  }

  return (
    <div className="flex gap-2">
      <Button onClick={() => decide('approved')} disabled={pending}>Approve</Button>
      <Button variant="danger" onClick={() => decide('rejected')} disabled={pending}>Reject</Button>
    </div>
  )
}
