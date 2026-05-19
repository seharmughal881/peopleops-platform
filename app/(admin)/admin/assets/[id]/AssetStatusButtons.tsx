'use client'

import { useTransition } from 'react'
import { setAssetStatus } from '@/lib/modules/assets/actions'
import { Button } from '@/lib/ui/Button'

export function AssetStatusButtons({ id, status }: { id: string; status: string }) {
  const [pending, startTransition] = useTransition()

  function go(next: 'available' | 'maintenance' | 'retired') {
    if (status === 'assigned') return
    const fd = new FormData()
    fd.set('id', id)
    fd.set('status', next)
    startTransition(async () => { await setAssetStatus(fd) })
  }

  if (status === 'assigned') return null
  return (
    <div className="flex gap-2">
      {status !== 'available' && <Button size="sm" variant="outline" onClick={() => go('available')} disabled={pending}>Mark available</Button>}
      {status !== 'maintenance' && <Button size="sm" variant="outline" onClick={() => go('maintenance')} disabled={pending}>Maintenance</Button>}
      {status !== 'retired' && <Button size="sm" variant="outline" onClick={() => go('retired')} disabled={pending}>Retire</Button>}
    </div>
  )
}
