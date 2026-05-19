'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { submitReview } from '@/lib/modules/performance/reviews'
import { Button } from '@/lib/ui/Button'
import { Field, Select, Textarea } from '@/lib/ui/Input'

interface Props {
  id: string
  readOnly: boolean
  defaults: { rating: number; strengths: string; growthAreas: string; comments: string }
}

export function SubmitReviewForm({ id, readOnly, defaults }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function onSubmit(formData: FormData) {
    if (readOnly) return
    setError(null)
    formData.set('id', id)
    startTransition(async () => {
      const r = await submitReview(formData)
      if (r?.error) setError(r.error)
      else router.push('/performance')
    })
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <Field label="Rating (1–5)">
        <Select name="rating" defaultValue={String(defaults.rating)} disabled={readOnly}>
          {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
        </Select>
      </Field>
      <Field label="Strengths"><Textarea name="strengths" rows={3} defaultValue={defaults.strengths} disabled={readOnly} /></Field>
      <Field label="Areas for growth"><Textarea name="growthAreas" rows={3} defaultValue={defaults.growthAreas} disabled={readOnly} /></Field>
      <Field label="Comments"><Textarea name="comments" rows={4} defaultValue={defaults.comments} disabled={readOnly} /></Field>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      {!readOnly && (
        <Button type="submit" disabled={pending}>{pending ? 'Submitting…' : 'Submit review'}</Button>
      )}
      {readOnly && <p className="text-sm text-foreground-muted">This review is locked.</p>}
    </form>
  )
}
