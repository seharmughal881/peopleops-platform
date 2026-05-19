'use client'

import { useRef, useState, useTransition } from 'react'
import { createCycle } from '@/lib/modules/performance/reviews'
import { Button } from '@/lib/ui/Button'
import { Field, Input } from '@/lib/ui/Input'

export function NewCycleForm() {
  const formRef = useRef<HTMLFormElement | null>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  function onSubmit(formData: FormData) {
    setError(null); setMessage(null)
    startTransition(async () => {
      const r = await createCycle(formData)
      if (r?.error) setError(r.error)
      else {
        setMessage('Created.')
        formRef.current?.reset()
      }
    })
  }

  return (
    <form ref={formRef} action={onSubmit} className="space-y-3">
      <Field label="Name"><Input name="name" required placeholder="2026 Q2 Review" /></Field>
      <Field label="Start date"><Input type="date" name="startDate" required /></Field>
      <Field label="End date"><Input type="date" name="endDate" required /></Field>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      {message && <p className="text-sm text-emerald-600">{message}</p>}
      <Button type="submit" disabled={pending} className="w-full">{pending ? 'Creating…' : 'Create cycle'}</Button>
    </form>
  )
}
