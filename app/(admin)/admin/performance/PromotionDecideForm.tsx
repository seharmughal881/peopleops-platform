'use client'

import { useState, useTransition } from 'react'
import { decidePromotion } from '@/lib/modules/performance/promotions'
import { Button } from '@/lib/ui/Button'

export function PromotionDecideForm({ id }: { id: string }) {
  const [open, setOpen] = useState(false)
  const [comments, setComments] = useState('')
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function decide(decision: 'approved' | 'rejected') {
    setError(null)
    const fd = new FormData()
    fd.set('id', id)
    fd.set('decision', decision)
    if (comments) fd.set('comments', comments)
    startTransition(async () => {
      const r = await decidePromotion(fd)
      if (r?.error) setError(r.error)
      else setOpen(false)
    })
  }

  if (!open) {
    return <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Decide</Button>
  }

  return (
    <div className="space-y-2 rounded-md border border-border bg-surface p-3">
      <textarea
        rows={2}
        placeholder="Comments (optional)"
        value={comments}
        onChange={(e) => setComments(e.target.value)}
        className="w-full rounded border border-border bg-surface px-2 py-1 text-sm"
      />
      {error && <p className="text-xs text-rose-600">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" onClick={() => decide('approved')} disabled={pending}>{pending ? '…' : 'Approve'}</Button>
        <Button size="sm" variant="danger" onClick={() => decide('rejected')} disabled={pending}>Reject</Button>
        <Button size="sm" variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  )
}
