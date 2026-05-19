'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createExpense } from '@/lib/modules/expenses/actions'
import { CATEGORIES } from '@/lib/modules/expenses/schemas'
import { Button } from '@/lib/ui/Button'
import { Field, Input, Select, Textarea } from '@/lib/ui/Input'

export function NewExpenseForm() {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement | null>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function onSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const r = await createExpense(formData)
      if (r?.error) setError(r.error)
      else if (r?.expenseId) {
        formRef.current?.reset()
        router.push(`/expenses/${r.expenseId}`)
      }
    })
  }

  return (
    <form ref={formRef} action={onSubmit} className="space-y-3">
      <Field label="Category">
        <Select name="category" defaultValue="travel">
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
      </Field>
      <Field label="Amount">
        <Input type="number" name="amount" step="0.01" min="0.01" required />
      </Field>
      <Field label="Currency">
        <Input name="currency" defaultValue="USD" maxLength={3} />
      </Field>
      <Field label="Date">
        <Input type="date" name="expenseDate" required />
      </Field>
      <Field label="Description">
        <Textarea name="description" rows={3} placeholder="What was this for?" />
      </Field>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? 'Creating…' : 'Create draft'}
      </Button>
    </form>
  )
}
