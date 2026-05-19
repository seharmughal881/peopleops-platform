'use client'

import { useRef, useState, useTransition } from 'react'
import { uploadDocument } from '@/lib/modules/employee/documents'
import { Button } from '@/lib/ui/Button'
import { Field, Input, Select } from '@/lib/ui/Input'

export function UploadDocForm({ employeeId }: { employeeId: string }) {
  const formRef = useRef<HTMLFormElement | null>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  function onSubmit(formData: FormData) {
    setError(null); setMessage(null)
    formData.set('employeeId', employeeId)
    startTransition(async () => {
      const r = await uploadDocument(formData)
      if (r?.error) setError(r.error)
      else {
        setMessage('Uploaded.')
        formRef.current?.reset()
      }
    })
  }

  return (
    <form ref={formRef} action={onSubmit} className="space-y-3">
      <Field label="Type">
        <Select name="type" defaultValue="other">
          <option value="contract">Contract</option>
          <option value="id">ID document</option>
          <option value="certification">Certification</option>
          <option value="other">Other</option>
        </Select>
      </Field>
      <Field label="File">
        <Input type="file" name="file" required accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx" />
      </Field>
      <Field label="Expires (optional)">
        <Input type="date" name="expiresAt" />
      </Field>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      {message && <p className="text-sm text-emerald-600">{message}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? 'Uploading…' : 'Upload'}
      </Button>
    </form>
  )
}
