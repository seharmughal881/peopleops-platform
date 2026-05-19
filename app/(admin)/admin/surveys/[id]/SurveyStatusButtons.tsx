'use client'

import { useTransition } from 'react'
import { setSurveyStatus } from '@/lib/modules/comms/surveys'
import { Button } from '@/lib/ui/Button'

export function SurveyStatusButtons({ id, status }: { id: string; status: string }) {
  const [pending, startTransition] = useTransition()

  function go(next: 'draft' | 'active' | 'closed') {
    const fd = new FormData()
    fd.set('id', id)
    fd.set('status', next)
    startTransition(async () => { await setSurveyStatus(fd) })
  }

  return (
    <div className="flex gap-2">
      {status === 'draft' && <Button size="sm" onClick={() => go('active')} disabled={pending}>Activate</Button>}
      {status === 'active' && <Button size="sm" variant="outline" onClick={() => go('closed')} disabled={pending}>Close</Button>}
    </div>
  )
}
