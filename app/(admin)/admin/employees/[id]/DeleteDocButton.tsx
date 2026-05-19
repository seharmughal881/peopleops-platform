'use client'

import { useTransition } from 'react'
import { deleteDocument } from '@/lib/modules/employee/documents'

export function DeleteDocButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition()
  function onClick() {
    if (!confirm('Delete this document?')) return
    const fd = new FormData()
    fd.set('id', id)
    startTransition(async () => {
      await deleteDocument(fd)
    })
  }
  return (
    <button onClick={onClick} disabled={pending} className="text-rose-600 hover:underline disabled:opacity-50">
      {pending ? 'Deleting…' : 'Delete'}
    </button>
  )
}
