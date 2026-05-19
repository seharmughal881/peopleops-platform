'use client'

import { useRef, useState, useTransition } from 'react'
import { createOffer, setOfferStatus } from '@/lib/modules/recruitment/offers'
import { Button } from '@/lib/ui/Button'
import { Field, Input, Textarea } from '@/lib/ui/Input'
import { Badge } from '@/lib/ui/Table'

interface OfferShape {
  id: string
  salary: number
  currency: string
  startDate: Date | string
  status: string
  notes: string | null
}

export function OfferPanel({ candidateId, offer }: { candidateId: string; offer: OfferShape | null }) {
  const formRef = useRef<HTMLFormElement | null>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function create(formData: FormData) {
    setError(null)
    formData.set('candidateId', candidateId)
    startTransition(async () => {
      const r = await createOffer(formData)
      if (r?.error) setError(r.error)
      else formRef.current?.reset()
    })
  }

  function transition(next: 'sent' | 'accepted' | 'declined' | 'withdrawn') {
    if (!offer) return
    setError(null)
    const fd = new FormData()
    fd.set('id', offer.id)
    fd.set('status', next)
    startTransition(async () => { await setOfferStatus(fd) })
  }

  if (offer) {
    return (
      <div className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-foreground-muted">Status</span>
          <Badge tone={offer.status === 'accepted' ? 'success' : offer.status === 'declined' || offer.status === 'withdrawn' ? 'danger' : 'info'}>{offer.status}</Badge>
        </div>
        <div className="flex justify-between"><span className="text-foreground-muted">Salary</span><span className="font-medium tabular-nums">{offer.salary.toFixed(2)} {offer.currency}</span></div>
        <div className="flex justify-between"><span className="text-foreground-muted">Start</span><span>{new Date(offer.startDate).toLocaleDateString()}</span></div>
        {offer.notes && <p className="rounded-md bg-surface-muted p-3 text-foreground">{offer.notes}</p>}
        {error && <p className="text-xs text-rose-600">{error}</p>}

        <div className="flex flex-wrap gap-2">
          {offer.status === 'draft' && <Button size="sm" onClick={() => transition('sent')} disabled={pending}>Send</Button>}
          {offer.status === 'sent' && (
            <>
              <Button size="sm" onClick={() => transition('accepted')} disabled={pending}>Mark accepted</Button>
              <Button size="sm" variant="danger" onClick={() => transition('declined')} disabled={pending}>Declined</Button>
              <Button size="sm" variant="outline" onClick={() => transition('withdrawn')} disabled={pending}>Withdraw</Button>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <form ref={formRef} action={create} className="space-y-3">
      <Field label="Salary" required><Input type="number" name="salary" step="0.01" min="0" required /></Field>
      <Field label="Currency"><Input name="currency" defaultValue="USD" maxLength={3} /></Field>
      <Field label="Start date" required><Input type="date" name="startDate" required /></Field>
      <Field label="Notes"><Textarea name="notes" rows={3} /></Field>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <Button type="submit" disabled={pending} className="w-full">{pending ? 'Creating…' : 'Draft offer'}</Button>
    </form>
  )
}
