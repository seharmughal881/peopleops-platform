'use client'

import { useTransition } from 'react'
import { withdrawPromotion } from '@/lib/modules/performance/promotions'

export function WithdrawPromotionButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition()
  function onClick() {
    if (!confirm('Withdraw this recommendation?')) return
    const fd = new FormData()
    fd.set('id', id)
    startTransition(async () => { await withdrawPromotion(fd) })
  }
  return (
    <button onClick={onClick} disabled={pending} className="text-rose-600 hover:underline disabled:opacity-50">
      {pending ? '…' : 'Withdraw'}
    </button>
  )
}
