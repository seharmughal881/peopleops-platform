'use client'

import { useRef, useState, useTransition } from 'react'
import { scheduleInterview } from '@/lib/modules/recruitment/interviews'
import { Button } from '@/lib/ui/Button'
import { Field, Input, Select } from '@/lib/ui/Input'

interface Props {
  candidateId: string
  interviewers: { id: string; firstName: string; lastName: string }[]
}

export function ScheduleInterviewForm({ candidateId, interviewers }: Props) {
  const formRef = useRef<HTMLFormElement | null>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  function onSubmit(formData: FormData) {
    setError(null); setMessage(null)
    formData.set('candidateId', candidateId)
    startTransition(async () => {
      const r = await scheduleInterview(formData)
      if (r?.error) setError(r.error)
      else {
        setMessage('Scheduled.')
        formRef.current?.reset()
      }
    })
  }

  return (
    <form ref={formRef} action={onSubmit} className="space-y-3">
      <Field label="Interviewer" required>
        <Select name="interviewerId" required defaultValue="">
          <option value="" disabled>— Select —</option>
          {interviewers.map((e) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
        </Select>
      </Field>
      <Field label="When" required><Input type="datetime-local" name="scheduledAt" required /></Field>
      <Field label="Type">
        <Select name="type" defaultValue="phone">
          <option value="phone">Phone</option>
          <option value="onsite">On-site</option>
          <option value="technical">Technical</option>
          <option value="cultural">Cultural</option>
          <option value="panel">Panel</option>
        </Select>
      </Field>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      {message && <p className="text-sm text-emerald-600">{message}</p>}
      <Button type="submit" disabled={pending} className="w-full">{pending ? 'Scheduling…' : 'Schedule'}</Button>
    </form>
  )
}
