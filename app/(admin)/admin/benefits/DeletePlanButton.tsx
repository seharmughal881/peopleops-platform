'use client'

import { useState, useTransition } from 'react'
import { deletePlan } from '@/lib/modules/benefits/actions'
import { Button } from '@/lib/ui/Button'

export function DeletePlanButton({
  id,
  name,
  enrollments,
}: {
  id: string
  name: string
  enrollments: number
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function onClick() {
    setError(null)
    const fd = new FormData()
    fd.set('id', id)

    if (enrollments > 0) {
      const msg =
        `⚠️  "${name}" has ${enrollments} enrollment${enrollments === 1 ? '' : 's'}.\n\n` +
        `Force-deleting this plan will also delete:\n` +
        `  • ${enrollments} enrollment record${enrollments === 1 ? '' : 's'}\n` +
        `  • All dependents linked to those enrollments\n\n` +
        `This cannot be undone. Type-confirm by clicking OK.`
      if (!window.confirm(msg)) return
      const second = window.prompt(
        `To confirm force delete, type the plan name exactly:\n\n"${name}"`,
      )
      if (second !== name) {
        setError('Name did not match — delete cancelled.')
        return
      }
      fd.set('force', 'true')
    } else {
      if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return
    }

    startTransition(async () => {
      const r = await deletePlan(fd)
      if (r?.error) setError(r.error)
    })
  }

  return (
    <div className="flex flex-col gap-1">
      <Button
        variant="outline"
        size="sm"
        onClick={onClick}
        disabled={pending}
        title={enrollments > 0 ? `Force delete (will cascade ${enrollments} enrollment${enrollments === 1 ? '' : 's'})` : 'Delete plan'}
      >
        {pending ? '…' : enrollments > 0 ? 'Force delete' : 'Delete'}
      </Button>
      {error && <span className="text-xs text-rose-600">{error}</span>}
    </div>
  )
}
