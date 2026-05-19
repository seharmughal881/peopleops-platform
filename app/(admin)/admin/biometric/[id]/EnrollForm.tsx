'use client'

import { useRef, useState, useTransition } from 'react'
import { enrollCredential } from '@/lib/modules/integrations/biometric-actions'
import { Button } from '@/lib/ui/Button'
import { Field, Input, Select } from '@/lib/ui/Input'

interface EmployeeOpt {
  id: string
  firstName: string
  lastName: string
  employeeCode: string
}

export function EnrollForm({ deviceId, employees }: { deviceId: string; employees: EmployeeOpt[] }) {
  const formRef = useRef<HTMLFormElement | null>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  function onSubmit(formData: FormData) {
    setError(null); setMessage(null)
    formData.set('deviceId', deviceId)
    startTransition(async () => {
      const r = await enrollCredential(formData)
      if (r?.error) setError(r.error)
      else {
        setMessage('Enrolled.')
        formRef.current?.reset()
      }
    })
  }

  return (
    <form ref={formRef} action={onSubmit} className="space-y-3">
      <Field label="Employee" required>
        <Select name="employeeId" required defaultValue="">
          <option value="" disabled>Select employee…</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>{e.lastName}, {e.firstName} ({e.employeeCode})</option>
          ))}
        </Select>
      </Field>
      <Field label="External employee ID on device" required hint="The ID/template number the device uses for this person.">
        <Input name="externalEmployeeId" required maxLength={120} placeholder="e.g. 1042" />
      </Field>
      <Field label="Label">
        <Input name="label" maxLength={120} placeholder="Right index finger" />
      </Field>
      {error && <p className="text-xs text-rose-600">{error}</p>}
      {message && <p className="text-xs text-emerald-600">{message}</p>}
      <Button type="submit" disabled={pending} className="w-full">{pending ? 'Enrolling…' : 'Enroll'}</Button>
    </form>
  )
}
