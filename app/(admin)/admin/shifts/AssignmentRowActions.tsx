'use client'

import { useTransition } from 'react'
import { endAssignment, deleteAssignment } from '@/lib/modules/attendance/shifts'
import { Button } from '@/lib/ui/Button'
import { toastError, toastSuccess } from '@/lib/ui/toast'

export function AssignmentRowActions({ id, ended }: { id: string; ended: boolean }) {
  const [pending, startTransition] = useTransition()

  function onEnd() {
    const fd = new FormData()
    fd.set('id', id)
    startTransition(async () => {
      const r = await endAssignment(fd)
      if (r?.error) toastError(r.error)
      else toastSuccess('Assignment ended')
    })
  }

  function onDelete() {
    if (!confirm('Delete this assignment?')) return
    const fd = new FormData()
    fd.set('id', id)
    startTransition(async () => {
      const r = await deleteAssignment(fd)
      if (r?.error) toastError(r.error)
      else toastSuccess('Assignment deleted')
    })
  }

  return (
    <div className="flex gap-1">
      {!ended && (
        <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={onEnd}>End today</Button>
      )}
      <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={onDelete}>Delete</Button>
    </div>
  )
}
