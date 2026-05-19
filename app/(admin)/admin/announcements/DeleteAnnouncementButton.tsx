'use client'

import { useTransition } from 'react'
import { deleteAnnouncement } from '@/lib/modules/comms/actions'

export function DeleteAnnouncementButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition()
  function onClick() {
    if (!confirm('Delete this announcement?')) return
    const fd = new FormData()
    fd.set('id', id)
    startTransition(async () => {
      await deleteAnnouncement(fd)
    })
  }
  return (
    <button onClick={onClick} disabled={pending} className="text-rose-600 hover:underline disabled:opacity-50">
      {pending ? 'Deleting…' : 'Delete'}
    </button>
  )
}
