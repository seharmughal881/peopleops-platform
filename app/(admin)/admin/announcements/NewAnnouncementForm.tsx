'use client'

import { useRef, useState, useTransition } from 'react'
import { createAnnouncement } from '@/lib/modules/comms/actions'
import { Button } from '@/lib/ui/Button'
import { Field, Input, Textarea } from '@/lib/ui/Input'

export function NewAnnouncementForm() {
  const formRef = useRef<HTMLFormElement | null>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  function onSubmit(formData: FormData) {
    setError(null); setMessage(null)
    startTransition(async () => {
      const r = await createAnnouncement(formData)
      if (r?.error) setError(r.error)
      else {
        setMessage('Published.')
        formRef.current?.reset()
      }
    })
  }

  return (
    <form ref={formRef} action={onSubmit} className="space-y-3">
      <Field label="Title"><Input name="title" required maxLength={160} /></Field>
      <Field label="Body"><Textarea name="body" required rows={6} /></Field>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      {message && <p className="text-sm text-emerald-600">{message}</p>}
      <Button type="submit" disabled={pending} className="w-full">{pending ? 'Publishing…' : 'Publish'}</Button>
    </form>
  )
}
