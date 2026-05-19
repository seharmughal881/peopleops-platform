'use client'

import { useRef, useState, useTransition } from 'react'
import { createEvent } from '@/lib/modules/comms/events'
import { Button } from '@/lib/ui/Button'
import { Field, Input, Textarea } from '@/lib/ui/Input'

export function NewEventForm() {
  const formRef = useRef<HTMLFormElement | null>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  function onSubmit(formData: FormData) {
    setError(null); setMessage(null)
    startTransition(async () => {
      const r = await createEvent(formData)
      if (r?.error) setError(r.error)
      else {
        setMessage('Created.')
        formRef.current?.reset()
      }
    })
  }

  return (
    <form ref={formRef} action={onSubmit} className="space-y-3">
      <Field label="Title" required><Input name="title" required maxLength={200} /></Field>
      <Field label="Description"><Textarea name="description" rows={3} /></Field>
      <Field label="Location"><Input name="location" /></Field>
      <Field label="Starts at" required><Input type="datetime-local" name="startsAt" required /></Field>
      <Field label="Ends at"><Input type="datetime-local" name="endsAt" /></Field>
      <Field label="Capacity"><Input type="number" name="capacity" min="1" /></Field>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      {message && <p className="text-sm text-emerald-600">{message}</p>}
      <Button type="submit" disabled={pending} className="w-full">{pending ? 'Creating…' : 'Create event'}</Button>
    </form>
  )
}
