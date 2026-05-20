'use client'

import { useState, useTransition } from 'react'
import { decideHiringRequest } from '@/lib/modules/recruitment/hiring-requests'
import { Button } from '@/lib/ui/Button'
import { Input } from '@/lib/ui/Input'

export function DecideForm({ approvalId }: { approvalId: string }) {
  const [pending, startTransition] = useTransition()
  const [comments, setComments] = useState('')
  const [error, setError] = useState<string | null>(null)

  function decide(decision: 'approved' | 'rejected') {
    setError(null)
    const fd = new FormData()
    fd.set('approvalId', approvalId)
    fd.set('decision', decision)
    if (comments) fd.set('comments', comments)
    startTransition(async () => {
      const r = await decideHiringRequest(fd)
      if (r?.error) setError(r.error)
    })
  }

  return (
    <div className="flex flex-col gap-1 min-w-[180px]">
      <Input placeholder="Comments…" value={comments} onChange={(e) => setComments(e.target.value)} className="text-xs" />
      <div className="flex gap-1">
        <Button size="sm" disabled={pending} onClick={() => decide('approved')}>Approve</Button>
        <Button size="sm" variant="danger" disabled={pending} onClick={() => decide('rejected')}>Reject</Button>
      </div>
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  )
}
