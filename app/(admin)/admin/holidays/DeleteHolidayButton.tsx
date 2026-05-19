'use client'

import { useTransition } from 'react'
import { deleteHoliday } from '@/lib/modules/leave/holidays'

export function DeleteHolidayButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition()
  function onClick() {
    const fd = new FormData()
    fd.set('id', id)
    startTransition(async () => {
      await deleteHoliday(fd)
    })
  }
  return (
    <button onClick={onClick} disabled={pending} className="text-rose-600 hover:underline disabled:opacity-50">
      {pending ? '…' : 'Delete'}
    </button>
  )
}
