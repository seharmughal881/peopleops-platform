'use client'

import { useTransition } from 'react'
import { decideOvertimeEntry } from '@/lib/modules/overtime-entries/actions'
import { Button } from '@/lib/ui/Button'
import { toastError, toastSuccess } from '@/lib/ui/toast'

export function OvertimeDecideForm({ approvalId }: { approvalId: string }) {
  const [pending, startTransition] = useTransition()

  function decide(decision: 'approved' | 'rejected') {
    const fd = new FormData()
    fd.set('approvalId', approvalId)
    fd.set('decision', decision)
    startTransition(async () => {
      const r = await decideOvertimeEntry(fd)
      if (r && 'error' in r && r.error) toastError(r.error)
      else toastSuccess(decision === 'approved' ? 'Approved' : 'Rejected')
    })
  }

  return (
    <div className="flex gap-2">
      <Button onClick={() => decide('approved')} disabled={pending}>Approve</Button>
      <Button variant="danger" onClick={() => decide('rejected')} disabled={pending}>Reject</Button>
    </div>
  )
}
