'use client'

import { useState, useTransition } from 'react'
import { updateShiftPattern, deleteShiftPattern } from '@/lib/modules/attendance/shifts'
import { Button } from '@/lib/ui/Button'
import { Field, Input } from '@/lib/ui/Input'
import { TR, TD } from '@/lib/ui/Table'

const TD_CLASS = 'px-4 py-3 text-foreground'
import { toastError, toastSuccess } from '@/lib/ui/toast'

interface Pattern {
  id: string
  name: string
  startTime: string
  endTime: string
  breakMinutes: number
  workDays: string
  _count: { employeeShifts: number }
}

export function PatternRow({ pattern }: { pattern: Pattern }) {
  const [editing, setEditing] = useState(false)
  const [pending, startTransition] = useTransition()

  function onSave(formData: FormData) {
    formData.set('id', pattern.id)
    startTransition(async () => {
      const r = await updateShiftPattern(formData)
      if (r?.error) toastError(r.error)
      else {
        toastSuccess('Pattern updated')
        setEditing(false)
      }
    })
  }

  function onDelete() {
    if (!confirm(`Delete shift pattern "${pattern.name}"?`)) return
    const fd = new FormData()
    fd.set('id', pattern.id)
    startTransition(async () => {
      const r = await deleteShiftPattern(fd)
      if (r?.error) toastError(r.error)
      else toastSuccess('Pattern deleted')
    })
  }

  if (editing) {
    return (
      <TR>
        <td className={TD_CLASS} colSpan={6}>
          <form action={onSave} className="grid grid-cols-1 gap-3 py-2 md:grid-cols-6">
            <Field label="Name"><Input name="name" required defaultValue={pattern.name} /></Field>
            <Field label="Start"><Input type="time" name="startTime" required defaultValue={pattern.startTime} /></Field>
            <Field label="End"><Input type="time" name="endTime" required defaultValue={pattern.endTime} /></Field>
            <Field label="Break (min)"><Input type="number" name="breakMinutes" min="0" max="240" defaultValue={pattern.breakMinutes} /></Field>
            <Field label="Work days"><Input name="workDays" defaultValue={pattern.workDays} /></Field>
            <div className="flex items-end gap-2">
              <Button type="submit" size="sm" disabled={pending}>{pending ? 'Saving…' : 'Save'}</Button>
              <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </form>
        </td>
      </TR>
    )
  }

  return (
    <TR>
      <TD className="font-medium">{pattern.name}</TD>
      <TD>{pattern.startTime} – {pattern.endTime}</TD>
      <TD>{pattern.breakMinutes}min</TD>
      <TD className="font-mono text-xs">{pattern.workDays}</TD>
      <TD>{pattern._count.employeeShifts}</TD>
      <TD>
        <div className="flex gap-1">
          <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => setEditing(true)}>Edit</Button>
          <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={onDelete}>Delete</Button>
        </div>
      </TD>
    </TR>
  )
}
