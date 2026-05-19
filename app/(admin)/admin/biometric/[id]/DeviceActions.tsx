'use client'

import { useState, useTransition } from 'react'
import { rotateDeviceSecret, toggleDevice } from '@/lib/modules/integrations/biometric-actions'
import { Button } from '@/lib/ui/Button'

export function DeviceActions({ id, status }: { id: string; status: string }) {
  const [pending, startTransition] = useTransition()
  const [newSecret, setNewSecret] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function callToggle() {
    setError(null)
    const fd = new FormData(); fd.set('id', id)
    startTransition(async () => {
      const r = await toggleDevice(fd)
      if (r?.error) setError(r.error)
    })
  }

  function callRotate() {
    setError(null); setNewSecret(null)
    if (!confirm('Rotate the device secret? The current one will stop working immediately.')) return
    const fd = new FormData(); fd.set('id', id)
    startTransition(async () => {
      const r = await rotateDeviceSecret(fd)
      if (r?.error) setError(r.error)
      else if (r?.secret) setNewSecret(r.secret)
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" disabled={pending} onClick={callToggle}>
          {status === 'active' ? 'Disable device' : 'Enable device'}
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={pending} onClick={callRotate}>
          Rotate secret
        </Button>
      </div>
      {error && <p className="text-xs text-rose-600">{error}</p>}
      {newSecret && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs dark:border-amber-700 dark:bg-amber-950/40">
          <p className="font-medium text-amber-800 dark:text-amber-300">New secret — save now, will not be shown again:</p>
          <code className="mt-2 block break-all rounded bg-amber-100 p-2 font-mono text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">{newSecret}</code>
        </div>
      )}
    </div>
  )
}
