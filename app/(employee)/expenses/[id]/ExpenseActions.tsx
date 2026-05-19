'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { attachReceipt, submitExpense, withdrawExpense } from '@/lib/modules/expenses/actions'
import { Button } from '@/lib/ui/Button'
import { Field, Input } from '@/lib/ui/Input'
import { Card, CardHeader } from '@/lib/ui/Card'

interface Props {
  expenseId: string
  canEdit: boolean
  canSubmit: boolean
  canWithdraw: boolean
}

export function ExpenseActions({ expenseId, canEdit, canSubmit, canWithdraw }: Props) {
  const router = useRouter()
  const uploadRef = useRef<HTMLFormElement | null>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  function doUpload(formData: FormData) {
    setError(null); setMessage(null)
    formData.set('expenseId', expenseId)
    startTransition(async () => {
      const r = await attachReceipt(formData)
      if (r?.error) setError(r.error)
      else {
        setMessage('Receipt attached.')
        uploadRef.current?.reset()
      }
    })
  }
  function doSubmit() {
    setError(null); setMessage(null)
    const fd = new FormData()
    fd.set('id', expenseId)
    startTransition(async () => {
      const r = await submitExpense(fd)
      if (r?.error) setError(r.error)
      else setMessage('Submitted for approval.')
    })
  }
  function doWithdraw() {
    if (!confirm('Withdraw and delete this expense?')) return
    setError(null); setMessage(null)
    const fd = new FormData()
    fd.set('id', expenseId)
    startTransition(async () => {
      const r = await withdrawExpense(fd)
      if (r?.error) setError(r.error)
      else router.push('/expenses')
    })
  }

  return (
    <div className="space-y-4">
      {canEdit && (
        <Card>
          <CardHeader title="Attach a receipt" subtitle="PDF, PNG, JPG up to 10 MB" />
          <form ref={uploadRef} action={doUpload} className="space-y-3">
            <Field label="File">
              <Input type="file" name="file" required accept=".pdf,.png,.jpg,.jpeg,.webp" />
            </Field>
            <Button type="submit" disabled={pending}>{pending ? 'Uploading…' : 'Attach'}</Button>
          </form>
        </Card>
      )}

      {(canSubmit || canWithdraw) && (
        <div className="flex flex-wrap gap-3">
          {canSubmit && (
            <Button onClick={doSubmit} disabled={pending}>
              {pending ? 'Submitting…' : 'Submit for approval'}
            </Button>
          )}
          {canWithdraw && (
            <Button variant="danger" onClick={doWithdraw} disabled={pending}>
              {pending ? '…' : 'Withdraw'}
            </Button>
          )}
        </div>
      )}

      {error && <p className="text-sm text-rose-600">{error}</p>}
      {message && <p className="text-sm text-emerald-600">{message}</p>}
    </div>
  )
}
