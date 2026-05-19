'use client'

import { useState, useTransition } from 'react'
import { updateMyProfile } from '@/lib/modules/employee/actions'
import { Button } from '@/lib/ui/Button'
import { Field, Input, Textarea } from '@/lib/ui/Input'

export function ProfileForm({
  defaults,
}: {
  defaults: { firstName: string; lastName: string; phone: string; personalEmail: string; address: string }
}) {
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function onSubmit(formData: FormData) {
    setMessage(null); setError(null)
    startTransition(async () => {
      const res = await updateMyProfile(formData)
      if (res?.error) setError(res.error)
      else setMessage('Profile updated.')
    })
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="First name">
          <Input name="firstName" defaultValue={defaults.firstName} required />
        </Field>
        <Field label="Last name">
          <Input name="lastName" defaultValue={defaults.lastName} required />
        </Field>
      </div>
      <Field label="Phone">
        <Input name="phone" defaultValue={defaults.phone} />
      </Field>
      <Field label="Personal email">
        <Input name="personalEmail" type="email" defaultValue={defaults.personalEmail} />
      </Field>
      <Field label="Address">
        <Textarea name="address" rows={3} defaultValue={defaults.address} />
      </Field>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      {message && <p className="text-sm text-emerald-600">{message}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Save changes'}
      </Button>
    </form>
  )
}
