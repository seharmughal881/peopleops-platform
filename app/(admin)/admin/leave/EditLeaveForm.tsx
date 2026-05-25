'use client'

import { useState, useTransition } from 'react'
import { editLeaveRequest } from '@/lib/modules/leave/actions'
import { Button } from '@/lib/ui/Button'

interface Props {
  id: string
  leaveType: string
  startDate: string // yyyy-mm-dd
  endDate: string
  reason: string | null
  status: string
}

const LEAVE_TYPES = ['vacation', 'sick', 'personal', 'unpaid']
const STATUSES = ['pending', 'approved', 'rejected', 'cancelled']

export function EditLeaveForm(props: Props) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [leaveType, setLeaveType] = useState(props.leaveType)
  const [startDate, setStartDate] = useState(props.startDate)
  const [endDate, setEndDate] = useState(props.endDate)
  const [reason, setReason] = useState(props.reason ?? '')
  const [status, setStatus] = useState(props.status)

  function save() {
    setError(null)
    const fd = new FormData()
    fd.set('id', props.id)
    fd.set('leaveType', leaveType)
    fd.set('startDate', startDate)
    fd.set('endDate', endDate)
    fd.set('reason', reason)
    fd.set('status', status)
    startTransition(async () => {
      const res = await editLeaveRequest(fd)
      if (res?.error) setError(res.error)
      else setOpen(false)
    })
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Edit
      </Button>
    )
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-surface-muted/40 p-3 text-xs">
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-foreground-muted">Type</span>
          <select
            value={leaveType}
            onChange={(e) => setLeaveType(e.target.value)}
            className="h-8 rounded-md border border-border bg-surface px-2 text-xs"
          >
            {LEAVE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-foreground-muted">Status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-8 rounded-md border border-border bg-surface px-2 text-xs"
          >
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-foreground-muted">Start</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-8 rounded-md border border-border bg-surface px-2 text-xs"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-foreground-muted">End</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-8 rounded-md border border-border bg-surface px-2 text-xs"
          />
        </label>
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-foreground-muted">Reason</span>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          className="rounded-md border border-border bg-surface px-2 py-1 text-xs"
        />
      </label>
      {error && <p className="text-rose-600">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" onClick={save} disabled={pending}>
          {pending ? 'Saving…' : 'Save'}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
