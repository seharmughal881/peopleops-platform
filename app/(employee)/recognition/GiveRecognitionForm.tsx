'use client'

import { useRef, useState, useTransition } from 'react'
import { giveRecognition } from '@/lib/modules/comms/recognition'
import { Button } from '@/lib/ui/Button'
import { Field, Select, Textarea } from '@/lib/ui/Input'

interface Props {
  peers: { id: string; firstName: string; lastName: string; employeeCode: string }[]
}

export function GiveRecognitionForm({ peers }: Props) {
  const formRef = useRef<HTMLFormElement | null>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  function onSubmit(formData: FormData) {
    setError(null); setMessage(null)
    startTransition(async () => {
      const r = await giveRecognition(formData)
      if (r?.error) setError(r.error)
      else {
        setMessage('Sent.')
        formRef.current?.reset()
      }
    })
  }

  return (
    <form ref={formRef} action={onSubmit} className="space-y-3">
      <Field label="To" required>
        <Select name="toEmployeeId" required defaultValue="">
          <option value="" disabled>— Select teammate —</option>
          {peers.map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}
        </Select>
      </Field>
      <Field label="Category">
        <Select name="category" defaultValue="kudos">
          <option value="kudos">Kudos</option>
          <option value="thanks">Thanks</option>
          <option value="achievement">Achievement</option>
          <option value="teamwork">Teamwork</option>
        </Select>
      </Field>
      <Field label="Message" required><Textarea name="message" rows={3} required maxLength={2000} /></Field>
      <Field label="Visibility">
        <Select name="visibility" defaultValue="public">
          <option value="public">Public (feed)</option>
          <option value="team">Private (recipient only)</option>
        </Select>
      </Field>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      {message && <p className="text-sm text-emerald-600">{message}</p>}
      <Button type="submit" disabled={pending} className="w-full">{pending ? 'Sending…' : 'Send recognition'}</Button>
    </form>
  )
}
