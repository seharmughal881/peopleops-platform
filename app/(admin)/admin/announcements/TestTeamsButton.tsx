'use client'

import { useState, useTransition } from 'react'
import { sendTeamsTest } from '@/lib/modules/integrations/actions'
import { Button } from '@/lib/ui/Button'

export function TestTeamsButton() {
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<{ tone: 'ok' | 'warn' | 'err'; text: string } | null>(null)

  function onClick() {
    setMsg(null)
    startTransition(async () => {
      const r = await sendTeamsTest()
      if (!r.configured) setMsg({ tone: 'warn', text: 'Teams not configured. Set TEAMS_WEBHOOK_URL in your env.' })
      else if (r.ok) setMsg({ tone: 'ok', text: 'Test message sent.' })
      else setMsg({ tone: 'err', text: r.error ?? 'Failed' })
    })
  }

  const tone =
    msg?.tone === 'ok' ? 'text-emerald-600' : msg?.tone === 'warn' ? 'text-amber-600' : 'text-rose-600'

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" size="sm" onClick={onClick} disabled={pending}>
        {pending ? 'Sending…' : 'Send Teams test'}
      </Button>
      {msg && <p className={`text-xs ${tone}`}>{msg.text}</p>}
    </div>
  )
}
