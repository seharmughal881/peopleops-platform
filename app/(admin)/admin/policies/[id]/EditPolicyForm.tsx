'use client'

import { useState, useTransition } from 'react'
import { updatePolicy } from '@/lib/modules/policies'
import { Button } from '@/lib/ui/Button'
import { Field, Input, Select, Textarea } from '@/lib/ui/Input'

interface Props {
  policy: { id: string; title: string; category: string; body: string; requiresAck: boolean }
}

export function EditPolicyForm({ policy }: Props) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  function onSubmit(formData: FormData) {
    setError(null); setMessage(null)
    formData.set('id', policy.id)
    startTransition(async () => {
      const r = await updatePolicy(formData)
      if (r?.error) setError(r.error)
      else setMessage('Saved.')
    })
  }

  return (
    <form action={onSubmit} className="space-y-3">
      <Field label="Title" required><Input name="title" required maxLength={200} defaultValue={policy.title} /></Field>
      <Field label="Category" required>
        <Select name="category" required defaultValue={policy.category}>
          <option value="general">General</option>
          <option value="code_of_conduct">Code of conduct</option>
          <option value="security">Security</option>
          <option value="hr">HR</option>
          <option value="finance">Finance</option>
        </Select>
      </Field>
      <Field label="Body (markdown)" required>
        <Textarea name="body" required rows={10} maxLength={40000} defaultValue={policy.body} />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="requiresAck" defaultChecked={policy.requiresAck} /> Requires acknowledgement
      </label>
      {error && <p className="text-xs text-rose-600">{error}</p>}
      {message && <p className="text-xs text-emerald-600">{message}</p>}
      <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save changes'}</Button>
    </form>
  )
}
