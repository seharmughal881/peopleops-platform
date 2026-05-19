'use client'

import { useTransition } from 'react'
import { setJobStatus } from '@/lib/modules/recruitment/jobs'
import { Button } from '@/lib/ui/Button'

export function JobStatusButtons({ id, status }: { id: string; status: string }) {
  const [pending, startTransition] = useTransition()

  function go(next: 'open' | 'closed' | 'filled' | 'draft') {
    const fd = new FormData()
    fd.set('id', id)
    fd.set('status', next)
    startTransition(async () => { await setJobStatus(fd) })
  }

  return (
    <div className="flex items-center gap-2">
      {status === 'draft' && <Button size="sm" onClick={() => go('open')} disabled={pending}>Open posting</Button>}
      {status === 'open' && <Button size="sm" variant="secondary" onClick={() => go('filled')} disabled={pending}>Mark filled</Button>}
      {status === 'open' && <Button size="sm" variant="outline" onClick={() => go('closed')} disabled={pending}>Close</Button>}
      {status === 'closed' && <Button size="sm" variant="outline" onClick={() => go('open')} disabled={pending}>Reopen</Button>}
    </div>
  )
}
