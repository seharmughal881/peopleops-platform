'use client'

import { useState, useTransition } from 'react'
import { logInterviewFeedback } from '@/lib/modules/recruitment/interviews'
import { Button } from '@/lib/ui/Button'

export function FeedbackForm({ id }: { id: string }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function onSubmit(formData: FormData) {
    setError(null)
    formData.set('id', id)
    startTransition(async () => {
      const r = await logInterviewFeedback(formData)
      if (r?.error) setError(r.error)
      else setOpen(false)
    })
  }

  if (!open) {
    return <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Log feedback</Button>
  }

  return (
    <form action={onSubmit} className="space-y-2 rounded-md border border-border bg-surface p-3">
      <select name="rating" defaultValue="3" required className="block w-full rounded border border-border bg-surface px-2 py-1 text-sm">
        {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}/5</option>)}
      </select>
      <select name="recommendation" required className="block w-full rounded border border-border bg-surface px-2 py-1 text-sm">
        <option value="hire">Hire</option>
        <option value="no_hire">No hire</option>
        <option value="maybe">Maybe</option>
      </select>
      <textarea name="feedback" rows={2} placeholder="Notes…" className="block w-full rounded border border-border bg-surface px-2 py-1 text-sm" />
      {error && <p className="text-xs text-rose-600">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" type="submit" disabled={pending}>{pending ? '…' : 'Save'}</Button>
        <Button size="sm" variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  )
}
