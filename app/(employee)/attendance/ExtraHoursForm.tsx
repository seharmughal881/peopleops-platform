'use client'

import { useState, useTransition } from 'react'
import { submitOvertimeEntry, cancelOvertimeEntry } from '@/lib/modules/overtime-entries/actions'
import { Button } from '@/lib/ui/Button'
import { Field, Input, Textarea } from '@/lib/ui/Input'
import { toastError, toastSuccess } from '@/lib/ui/toast'

function todayKey(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export function ExtraHoursForm() {
  const [pending, startTransition] = useTransition()
  const [workDate, setWorkDate] = useState(todayKey())
  const [hours, setHours] = useState('1')
  const [reason, setReason] = useState('')
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({})

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrors({})
    const fd = new FormData()
    fd.set('workDate', workDate)
    fd.set('hours', hours)
    fd.set('reason', reason)
    startTransition(async () => {
      const r = await submitOvertimeEntry(fd)
      if (r && 'error' in r && r.error) {
        toastError(r.error)
        if (r.fieldErrors) setErrors(r.fieldErrors)
        return
      }
      setReason('')
      setHours('1')
      toastSuccess('Submitted for approval')
    })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Date" required error={errors.workDate?.[0]}>
          <Input
            type="date"
            value={workDate}
            onChange={(e) => setWorkDate(e.target.value)}
            max={todayKey()}
            required
          />
        </Field>
        <Field label="Hours" hint="0.25 – 24" required error={errors.hours?.[0]}>
          <Input
            type="number"
            step="0.25"
            min="0.25"
            max="24"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            required
          />
        </Field>
      </div>
      <Field label="Reason" required error={errors.reason?.[0]}>
        <Textarea
          rows={2}
          placeholder="e.g. Finished urgent ticket from home after hours"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
        />
      </Field>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? 'Submitting…' : 'Submit for approval'}
        </Button>
      </div>
    </form>
  )
}

export function CancelEntryButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition()
  function onClick() {
    const fd = new FormData()
    fd.set('id', id)
    startTransition(async () => {
      const r = await cancelOvertimeEntry(fd)
      if (r && 'error' in r && r.error) toastError(r.error)
      else toastSuccess('Cancelled')
    })
  }
  return (
    <Button variant="outline" onClick={onClick} disabled={pending}>
      Cancel
    </Button>
  )
}
