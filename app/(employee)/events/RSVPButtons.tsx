'use client'

import { useTransition } from 'react'
import { rsvp } from '@/lib/modules/comms/events'
import { Button } from '@/lib/ui/Button'
import { toastError, toastSuccess } from '@/lib/ui/toast'

const OPTIONS = [
  { value: 'going', label: 'Going' },
  { value: 'maybe', label: 'Maybe' },
  { value: 'notGoing', label: 'Not going' },
] as const

export function RSVPButtons({ eventId, current }: { eventId: string; current?: string }) {
  const [pending, startTransition] = useTransition()

  function go(status: 'going' | 'maybe' | 'notGoing') {
    const fd = new FormData()
    fd.set('eventId', eventId)
    fd.set('status', status)
    startTransition(async () => {
      const r = await rsvp(fd)
      if (r && 'error' in r && r.error) toastError(r.error)
      else {
        const label = OPTIONS.find((o) => o.value === status)?.label ?? 'Updated'
        toastSuccess(`RSVP set to “${label}”`)
      }
    })
  }

  return (
    <div className="flex flex-wrap gap-2">
      {OPTIONS.map((o) => (
        <Button
          key={o.value}
          size="sm"
          variant={current === o.value ? 'primary' : 'outline'}
          onClick={() => go(o.value)}
          disabled={pending}
        >
          {o.label}
        </Button>
      ))}
    </div>
  )
}
