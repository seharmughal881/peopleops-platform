'use client'

import { useRef, useState, useTransition } from 'react'
import { initiateReview } from '@/lib/modules/performance/reviews'
import { Button } from '@/lib/ui/Button'
import { Field, Select } from '@/lib/ui/Input'

interface Props {
  cycles: { id: string; name: string }[]
  reports: { id: string; firstName: string; lastName: string; employeeCode: string }[]
}

export function InitiateReviewForm({ cycles, reports }: Props) {
  const formRef = useRef<HTMLFormElement | null>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  function onSubmit(formData: FormData) {
    setError(null); setMessage(null)
    startTransition(async () => {
      const r = await initiateReview(formData)
      if (r?.error) setError(r.error)
      else {
        setMessage('Review created.')
        formRef.current?.reset()
      }
    })
  }

  return (
    <form ref={formRef} action={onSubmit} className="space-y-3">
      <Field label="Cycle">
        <Select name="cycleId" required defaultValue="">
          <option value="" disabled>— Select —</option>
          {cycles.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </Field>
      <Field label="Subject (employee being reviewed)">
        <Select name="subjectId" required defaultValue="">
          <option value="" disabled>— Select —</option>
          {reports.map((r) => <option key={r.id} value={r.id}>{r.firstName} {r.lastName} ({r.employeeCode})</option>)}
        </Select>
      </Field>
      <Field label="Reviewer (who writes it)">
        <Select name="reviewerId" required defaultValue="">
          <option value="" disabled>— Select —</option>
          {reports.map((r) => <option key={r.id} value={r.id}>{r.firstName} {r.lastName} (self)</option>)}
        </Select>
      </Field>
      <Field label="Type">
        <Select name="type" defaultValue="manager">
          <option value="manager">Manager</option>
          <option value="self">Self</option>
          <option value="peer">Peer</option>
          <option value="upward">Upward</option>
        </Select>
      </Field>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      {message && <p className="text-sm text-emerald-600">{message}</p>}
      <Button type="submit" disabled={pending} className="w-full">{pending ? 'Creating…' : 'Initiate review'}</Button>
    </form>
  )
}
