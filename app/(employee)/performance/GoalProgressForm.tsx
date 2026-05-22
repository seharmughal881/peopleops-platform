'use client'

import { useState, useTransition } from 'react'
import { updateGoalProgress } from '@/lib/modules/performance/goals'
import { toastError } from '@/lib/ui/toast'

export function GoalProgressForm({ id, initial }: { id: string; initial: number }) {
  const [value, setValue] = useState(initial)
  const [pending, startTransition] = useTransition()

  function save() {
    const fd = new FormData()
    fd.set('id', id)
    fd.set('progress', String(value))
    startTransition(async () => {
      const r = await updateGoalProgress(fd)
      if (r && 'error' in r && r.error) toastError(r.error)
    })
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        onMouseUp={save}
        onTouchEnd={save}
        disabled={pending}
        className="w-24"
      />
      <span className="w-10 text-xs text-foreground-muted">{value}%</span>
    </div>
  )
}
