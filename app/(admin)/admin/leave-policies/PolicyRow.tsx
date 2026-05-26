'use client'

import { useState, useTransition } from 'react'
import { TR, TD } from '@/lib/ui/Table'
import { Badge } from '@/lib/ui/Badge'
import { Button } from '@/lib/ui/Button'
import { Input, Select } from '@/lib/ui/Input'
import {
  updateLeavePolicy,
  toggleLeavePolicyActive,
  deleteLeavePolicy,
} from '@/lib/modules/leave-policies'

type Policy = {
  id: string
  name: string
  leaveType: string
  annualEntitlement: number
  carryForwardMax: number
  active: boolean
}

export function PolicyRow({ policy }: { policy: Policy }) {
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function onSave(formData: FormData) {
    setError(null)
    formData.set('id', policy.id)
    startTransition(async () => {
      const r = await updateLeavePolicy(formData)
      if (r?.error) setError(r.error)
      else setEditing(false)
    })
  }

  function onToggle() {
    setError(null)
    const fd = new FormData()
    fd.set('id', policy.id)
    startTransition(async () => {
      const r = await toggleLeavePolicyActive(fd)
      if (r?.error) setError(r.error)
    })
  }

  function onDelete() {
    if (!confirm(`Delete policy "${policy.name}"? This cannot be undone.`)) return
    setError(null)
    const fd = new FormData()
    fd.set('id', policy.id)
    startTransition(async () => {
      const r = await deleteLeavePolicy(fd)
      if (r?.error) setError(r.error)
    })
  }

  if (editing) {
    return (
      <TR>
        <TD colSpan={6} className="bg-surface-muted/40">
          <form action={onSave} className="grid grid-cols-1 gap-2 sm:grid-cols-6 sm:items-end">
            <label className="block text-xs">
              <span className="mb-1 block text-foreground-muted">Name</span>
              <Input name="name" defaultValue={policy.name} required />
            </label>
            <label className="block text-xs">
              <span className="mb-1 block text-foreground-muted">Type</span>
              <Select name="leaveType" defaultValue={policy.leaveType} required>
                <option value="vacation">Vacation</option>
                <option value="sick">Sick</option>
                <option value="personal">Personal</option>
                <option value="unpaid">Unpaid</option>
              </Select>
            </label>
            <label className="block text-xs">
              <span className="mb-1 block text-foreground-muted">Annual days</span>
              <Input type="number" name="annualEntitlement" min={0} max={365} step="0.5" defaultValue={policy.annualEntitlement} required />
            </label>
            <label className="block text-xs">
              <span className="mb-1 block text-foreground-muted">Carry-fwd</span>
              <Input type="number" name="carryForwardMax" min={0} max={365} step="0.5" defaultValue={policy.carryForwardMax} />
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" name="active" defaultChecked={policy.active} className="h-4 w-4" />
              <span>Active</span>
            </label>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={pending}>{pending ? 'Saving…' : 'Save'}</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => { setEditing(false); setError(null) }} disabled={pending}>Cancel</Button>
            </div>
            {error && <p className="sm:col-span-6 text-xs text-rose-600">{error}</p>}
          </form>
        </TD>
      </TR>
    )
  }

  return (
    <TR>
      <TD className="font-medium">{policy.name}</TD>
      <TD className="capitalize text-foreground-muted">{policy.leaveType}</TD>
      <TD className="tabular-nums">{policy.annualEntitlement} days</TD>
      <TD className="tabular-nums">{policy.carryForwardMax} days</TD>
      <TD>
        <Badge tone={policy.active ? 'success' : 'neutral'}>
          {policy.active ? 'active' : 'archived'}
        </Badge>
      </TD>
      <TD>
        <div className="flex items-center gap-3 text-xs">
          <button
            onClick={() => setEditing(true)}
            disabled={pending}
            className="text-foreground-muted hover:text-foreground disabled:opacity-50"
          >
            Edit
          </button>
          <button
            onClick={onToggle}
            disabled={pending}
            className="text-foreground-muted hover:text-foreground disabled:opacity-50"
          >
            {policy.active ? 'Archive' : 'Restore'}
          </button>
          <button
            onClick={onDelete}
            disabled={pending}
            className="text-rose-600 hover:underline disabled:opacity-50"
          >
            Delete
          </button>
          {error && <span className="text-rose-600">{error}</span>}
        </div>
      </TD>
    </TR>
  )
}
