'use client'

import { useTransition } from 'react'
import { decideLeaveRequest } from '@/lib/modules/leave/actions'
import { Button } from '@/lib/ui/Button'

export function LeaveDecideForm({ approvalId }: { approvalId: string }) {
  const [pending, startTransition] = useTransition()

  function decide(decision: 'approved' | 'rejected') {
    const fd = new FormData()
    fd.set('approvalId', approvalId)
    fd.set('decision', decision)
    startTransition(async () => {
      await decideLeaveRequest(fd)
    })
  }

  return (
    <div className="flex gap-2">
      <Button onClick={() => decide('approved')} disabled={pending}>Approve</Button>
      <Button variant="danger" onClick={() => decide('rejected')} disabled={pending}>Reject</Button>
    </div>
  )
}
