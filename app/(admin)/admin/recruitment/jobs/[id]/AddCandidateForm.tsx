'use client'

import { useRef, useState, useTransition } from 'react'
import { addCandidate } from '@/lib/modules/recruitment/candidates'
import { Button } from '@/lib/ui/Button'
import { Field, Input, Select, Textarea } from '@/lib/ui/Input'

export function AddCandidateForm({ jobPostingId }: { jobPostingId: string }) {
  const formRef = useRef<HTMLFormElement | null>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  function onSubmit(formData: FormData) {
    setError(null); setMessage(null)
    formData.set('jobPostingId', jobPostingId)
    startTransition(async () => {
      const r = await addCandidate(formData)
      if (r?.error) setError(r.error)
      else {
        setMessage('Candidate added.')
        formRef.current?.reset()
      }
    })
  }

  return (
    <form ref={formRef} action={onSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="First name" required><Input name="firstName" required /></Field>
        <Field label="Last name" required><Input name="lastName" required /></Field>
      </div>
      <Field label="Email" required><Input type="email" name="email" required /></Field>
      <Field label="Phone"><Input name="phone" /></Field>
      <Field label="Source">
        <Select name="source" defaultValue="direct">
          <option value="direct">Direct</option>
          <option value="linkedIn">LinkedIn</option>
          <option value="referral">Referral</option>
          <option value="other">Other</option>
        </Select>
      </Field>
      <Field label="Resume" hint="PDF or DOCX, up to 10MB"><Input type="file" name="resume" accept=".pdf,.doc,.docx" /></Field>
      <Field label="Notes"><Textarea name="notes" rows={2} /></Field>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      {message && <p className="text-sm text-emerald-600">{message}</p>}
      <Button type="submit" disabled={pending} className="w-full">{pending ? 'Adding…' : 'Add candidate'}</Button>
    </form>
  )
}
