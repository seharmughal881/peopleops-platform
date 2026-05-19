'use client'

import { useRef, useState, useTransition } from 'react'
import { addHoliday } from '@/lib/modules/leave/holidays'
import { Button } from '@/lib/ui/Button'
import { Field, Input } from '@/lib/ui/Input'

export function NewHolidayForm() {
  const formRef = useRef<HTMLFormElement | null>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  function onSubmit(formData: FormData) {
    setError(null); setMessage(null)
    startTransition(async () => {
      const r = await addHoliday(formData)
      if (r?.error) setError(r.error)
      else {
        setMessage('Added.')
        formRef.current?.reset()
      }
    })
  }

  return (
    <form ref={formRef} action={onSubmit} className="space-y-3">
      <Field label="Date"><Input type="date" name="date" required /></Field>
      <Field label="Name"><Input name="name" required /></Field>
      <Field label="Country code"><Input name="country" defaultValue="US" maxLength={2} /></Field>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      {message && <p className="text-sm text-emerald-600">{message}</p>}
      <Button type="submit" disabled={pending} className="w-full">{pending ? 'Adding…' : 'Add'}</Button>
    </form>
  )
}
