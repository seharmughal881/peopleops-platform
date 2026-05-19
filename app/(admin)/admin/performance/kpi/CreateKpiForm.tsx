'use client'

import { useRef, useState, useTransition } from 'react'
import { createKpi } from '@/lib/modules/performance/kpi'
import { Button } from '@/lib/ui/Button'
import { Field, Input, Select, Textarea } from '@/lib/ui/Input'

interface EmpOpt { id: string; firstName: string; lastName: string; employeeCode: string }

function defaultPeriod(): string {
  const d = new Date()
  const q = Math.floor(d.getMonth() / 3) + 1
  return `${d.getFullYear()}-Q${q}`
}

export function CreateKpiForm({ employees }: { employees: EmpOpt[] }) {
  const formRef = useRef<HTMLFormElement | null>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  function onSubmit(formData: FormData) {
    setError(null); setMessage(null)
    startTransition(async () => {
      const r = await createKpi(formData)
      if (r?.error) setError(r.error)
      else { setMessage('KPI created.'); formRef.current?.reset() }
    })
  }

  return (
    <form ref={formRef} action={onSubmit} className="space-y-3">
      <Field label="Employee" required>
        <Select name="employeeId" required defaultValue="">
          <option value="" disabled>Select…</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>{e.lastName}, {e.firstName} ({e.employeeCode})</option>
          ))}
        </Select>
      </Field>
      <Field label="Name" required><Input name="name" required maxLength={160} /></Field>
      <Field label="Description"><Textarea name="description" rows={2} maxLength={2000} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Target" required><Input type="number" step="any" name="target" required /></Field>
        <Field label="Unit" hint="%, $, hours…"><Input name="unit" maxLength={20} placeholder="%" /></Field>
      </div>
      <Field label="Period" required hint="e.g. 2026-Q1, 2026-05">
        <Input name="period" required defaultValue={defaultPeriod()} maxLength={40} />
      </Field>
      {error && <p className="text-xs text-rose-600">{error}</p>}
      {message && <p className="text-xs text-emerald-600">{message}</p>}
      <Button type="submit" disabled={pending} className="w-full">{pending ? 'Saving…' : 'Create KPI'}</Button>
    </form>
  )
}
