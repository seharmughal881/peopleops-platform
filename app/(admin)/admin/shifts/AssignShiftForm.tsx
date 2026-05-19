'use client'

import { useRef, useState, useTransition } from 'react'
import { assignShift } from '@/lib/modules/attendance/shifts'
import { Button } from '@/lib/ui/Button'
import { Field, Input, Select } from '@/lib/ui/Input'

interface Props {
  employees: { id: string; firstName: string; lastName: string; employeeCode: string }[]
  patterns: { id: string; name: string }[]
}

export function AssignShiftForm({ employees, patterns }: Props) {
  const formRef = useRef<HTMLFormElement | null>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  function onSubmit(formData: FormData) {
    setError(null); setMessage(null)
    startTransition(async () => {
      const r = await assignShift(formData)
      if (r?.error) setError(r.error)
      else {
        setMessage('Assigned.')
        formRef.current?.reset()
      }
    })
  }

  return (
    <form ref={formRef} action={onSubmit} className="space-y-3">
      <Field label="Employee">
        <Select name="employeeId" required defaultValue="">
          <option value="" disabled>— Select —</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.employeeCode})</option>
          ))}
        </Select>
      </Field>
      <Field label="Shift pattern">
        <Select name="shiftPatternId" required defaultValue="">
          <option value="" disabled>— Select —</option>
          {patterns.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
      </Field>
      <Field label="Effective from"><Input type="date" name="effectiveFrom" required /></Field>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      {message && <p className="text-sm text-emerald-600">{message}</p>}
      <Button type="submit" disabled={pending || patterns.length === 0} className="w-full">
        {pending ? 'Assigning…' : 'Assign'}
      </Button>
      {patterns.length === 0 && <p className="text-xs text-foreground-muted">Create a shift pattern first.</p>}
    </form>
  )
}
