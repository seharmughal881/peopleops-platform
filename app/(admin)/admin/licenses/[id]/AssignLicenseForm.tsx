'use client'

import { useState, useTransition } from 'react'
import { assignLicense } from '@/lib/modules/assets/actions'
import { Button } from '@/lib/ui/Button'
import { Field, Select } from '@/lib/ui/Input'

interface Props {
  licenseId: string
  employees: { id: string; firstName: string; lastName: string; employeeCode: string }[]
}

export function AssignLicenseForm({ licenseId, employees }: Props) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function onSubmit(formData: FormData) {
    setError(null)
    formData.set('licenseId', licenseId)
    startTransition(async () => {
      const r = await assignLicense(formData)
      if (r?.error) setError(r.error)
    })
  }

  return (
    <form action={onSubmit} className="space-y-3">
      <Field label="Employee" required>
        <Select name="employeeId" required defaultValue="">
          <option value="" disabled>— Select —</option>
          {employees.map((e) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.employeeCode})</option>)}
        </Select>
      </Field>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <Button type="submit" disabled={pending} className="w-full">{pending ? 'Assigning…' : 'Assign seat'}</Button>
    </form>
  )
}
