'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createJob } from '@/lib/modules/recruitment/jobs'
import { Button } from '@/lib/ui/Button'
import { Field, Input, Select, Textarea } from '@/lib/ui/Input'

export function NewJobForm() {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement | null>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function onSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const r = await createJob(formData)
      if (r?.error) setError(r.error)
      else if (r?.jobId) {
        formRef.current?.reset()
        router.push(`/admin/recruitment/jobs/${r.jobId}`)
      }
    })
  }

  return (
    <form ref={formRef} action={onSubmit} className="space-y-3">
      <Field label="Title" required><Input name="title" required maxLength={200} /></Field>
      <Field label="Description" required><Textarea name="description" required rows={4} /></Field>
      <Field label="Location"><Input name="location" placeholder="Remote / NYC" /></Field>
      <Field label="Employment type">
        <Select name="employmentType" defaultValue="fullTime">
          <option value="fullTime">Full-time</option>
          <option value="partTime">Part-time</option>
          <option value="contract">Contract</option>
          <option value="intern">Intern</option>
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Salary min"><Input type="number" name="salaryMin" min="0" /></Field>
        <Field label="Salary max"><Input type="number" name="salaryMax" min="0" /></Field>
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <Button type="submit" disabled={pending} className="w-full">{pending ? 'Creating…' : 'Create posting'}</Button>
    </form>
  )
}
