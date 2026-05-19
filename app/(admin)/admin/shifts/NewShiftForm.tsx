'use client'

import { useRef, useState, useTransition } from 'react'
import { createShiftPattern } from '@/lib/modules/attendance/shifts'
import { Button } from '@/lib/ui/Button'
import { Field, Input } from '@/lib/ui/Input'

export function NewShiftForm() {
  const formRef = useRef<HTMLFormElement | null>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  function onSubmit(formData: FormData) {
    setError(null); setMessage(null)
    startTransition(async () => {
      const r = await createShiftPattern(formData)
      if (r?.error) setError(r.error)
      else {
        setMessage('Created.')
        formRef.current?.reset()
      }
    })
  }

  return (
    <form ref={formRef} action={onSubmit} className="space-y-3">
      <Field label="Name"><Input name="name" required placeholder="Night shift" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Start time"><Input type="time" name="startTime" required defaultValue="09:00" /></Field>
        <Field label="End time"><Input type="time" name="endTime" required defaultValue="17:00" /></Field>
      </div>
      <Field label="Break (minutes)"><Input type="number" name="breakMinutes" defaultValue="60" min="0" max="240" /></Field>
      <Field label="Work days (0=Sun … 6=Sat, CSV)">
        <Input name="workDays" defaultValue="1,2,3,4,5" />
      </Field>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      {message && <p className="text-sm text-emerald-600">{message}</p>}
      <Button type="submit" disabled={pending} className="w-full">{pending ? 'Creating…' : 'Create pattern'}</Button>
    </form>
  )
}
