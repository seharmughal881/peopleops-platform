'use client'

import { useState, useTransition } from 'react'
import { rsvp } from '@/lib/modules/comms/events'
import { Button } from '@/lib/ui/Button'

const OPTIONS = [
  { value: 'going', label: 'Going' },
  { value: 'maybe', label: 'Maybe' },
  { value: 'notGoing', label: 'Not going' },
] as const

export function RSVPButtons({ eventId, current }: { eventId: string; current?: string }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function go(status: 'going' | 'maybe' | 'notGoing') {
    setError(null)
    const fd = new FormData()
    fd.set('eventId', eventId)
    fd.set('status', status)
    startTransition(async () => {
      const r = await rsvp(fd)
      if (r?.error) setError(r.error)
    })
  }

  return (
    <div className="space-y-2">
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
      {error && <p className="text-sm text-rose-600">{error}</p>}
    </div>
  )
}
