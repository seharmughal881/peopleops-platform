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
  const [selected, setSelected] = useState<string[]>([])

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function selectAll() {
    setSelected(employees.map((e) => e.id))
  }
  function clearAll() {
    setSelected([])
  }

  function onSubmit(formData: FormData) {
    setError(null); setMessage(null)
    formData.delete('employeeIds')
    for (const id of selected) formData.append('employeeIds', id)
    startTransition(async () => {
      const r = await assignShift(formData)
      if (r?.error) setError(r.error)
      else {
        setMessage(`Assigned to ${r?.count ?? selected.length} employee(s).`)
        formRef.current?.reset()
        setSelected([])
      }
    })
  }

  return (
    <form ref={formRef} action={onSubmit} className="space-y-3">
      <Field label={`Employees (${selected.length} selected)`}>
        <div className="max-h-48 overflow-y-auto rounded-md border border-border bg-surface p-2 text-sm">
          {employees.length === 0 && <p className="text-foreground-muted">No active employees.</p>}
          {employees.map((e) => (
            <label key={e.id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 hover:bg-surface-muted">
              <input
                type="checkbox"
                checked={selected.includes(e.id)}
                onChange={() => toggle(e.id)}
              />
              <span>{e.firstName} {e.lastName} <span className="text-foreground-muted">({e.employeeCode})</span></span>
            </label>
          ))}
        </div>
        <div className="mt-1 flex gap-2 text-xs">
          <button type="button" className="text-foreground-muted underline" onClick={selectAll}>Select all</button>
          <button type="button" className="text-foreground-muted underline" onClick={clearAll}>Clear</button>
        </div>
      </Field>
      <Field label="Shift pattern">
        <Select name="shiftPatternId" required defaultValue="">
          <option value="" disabled>— Select —</option>
          {patterns.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Effective from"><Input type="date" name="effectiveFrom" required /></Field>
        <Field label="Effective to (optional)"><Input type="date" name="effectiveTo" /></Field>
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      {message && <p className="text-sm text-emerald-600">{message}</p>}
      <Button type="submit" disabled={pending || patterns.length === 0 || selected.length === 0} className="w-full">
        {pending ? 'Assigning…' : `Assign ${selected.length || ''}`}
      </Button>
      {patterns.length === 0 && <p className="text-xs text-foreground-muted">Create a shift pattern first.</p>}
    </form>
  )
}
