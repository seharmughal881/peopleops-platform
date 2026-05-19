'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createEmployee } from '@/lib/modules/employee/actions'
import { Button } from '@/lib/ui/Button'
import { Field, Input, Select } from '@/lib/ui/Input'

interface Props {
  departments: { id: string; name: string }[]
  managers: { id: string; firstName: string; lastName: string }[]
}

export function NewEmployeeForm({ departments, managers }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function onSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const r = await createEmployee(formData)
      if (r?.error) setError(r.error)
      else router.push('/admin/employees')
    })
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Employee code"><Input name="employeeCode" required /></Field>
        <Field label="Email"><Input name="email" type="email" required /></Field>
        <Field label="First name"><Input name="firstName" required /></Field>
        <Field label="Last name"><Input name="lastName" required /></Field>
        <Field label="Join date"><Input type="date" name="joinDate" required /></Field>
        <Field label="Job title"><Input name="jobTitle" /></Field>
        <Field label="Department">
          <Select name="departmentId" defaultValue="">
            <option value="">— None —</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        </Field>
        <Field label="Manager">
          <Select name="managerId" defaultValue="">
            <option value="">— None —</option>
            {managers.map((m) => <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>)}
          </Select>
        </Field>
        <Field label="Temporary password"><Input name="tempPassword" type="text" defaultValue="welcome123" required /></Field>
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <Button type="submit" disabled={pending}>{pending ? 'Creating…' : 'Create employee'}</Button>
    </form>
  )
}
