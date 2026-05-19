'use client'

import { useRef, useState, useTransition } from 'react'
import { createPolicy } from '@/lib/modules/policies'
import { Button } from '@/lib/ui/Button'
import { Field, Input, Select, Textarea } from '@/lib/ui/Input'

export function NewPolicyForm() {
  const formRef = useRef<HTMLFormElement | null>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  function onSubmit(formData: FormData) {
    setError(null); setMessage(null)
    startTransition(async () => {
      const r = await createPolicy(formData)
      if (r?.error) setError(r.error)
      else { setMessage('Published.'); formRef.current?.reset() }
    })
  }

  return (
    <form ref={formRef} action={onSubmit} className="space-y-3">
      <Field label="Title" required><Input name="title" required maxLength={200} /></Field>
      <Field label="Category" required>
        <Select name="category" required defaultValue="general">
          <option value="general">General</option>
          <option value="code_of_conduct">Code of conduct</option>
          <option value="security">Security</option>
          <option value="hr">HR</option>
          <option value="finance">Finance</option>
        </Select>
      </Field>
      <Field label="Body (markdown)" required>
        <Textarea name="body" required rows={10} maxLength={40000} placeholder="# Policy heading…" />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="requiresAck" defaultChecked /> Requires acknowledgement
      </label>
      {error && <p className="text-xs text-rose-600">{error}</p>}
      {message && <p className="text-xs text-emerald-600">{message}</p>}
      <Button type="submit" disabled={pending} className="w-full">{pending ? 'Publishing…' : 'Publish'}</Button>
    </form>
  )
}
