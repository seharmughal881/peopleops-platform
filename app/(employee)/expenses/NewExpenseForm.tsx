'use client'

import { useRouter } from 'next/navigation'
import { createExpense } from '@/lib/modules/expenses/actions'
import { CATEGORIES } from '@/lib/modules/expenses/schemas'
import { Button } from '@/lib/ui/Button'
import { Field, Input, Select, Textarea } from '@/lib/ui/Input'
import {
  Form,
  fieldError,
  useActionForm,
  type ActionState,
} from '@/lib/ui/Form'

type CreateExpenseResult = Awaited<ReturnType<typeof createExpense>>

async function action(
  _prev: ActionState<{ expenseId: string }> | undefined,
  formData: FormData,
): Promise<ActionState<{ expenseId: string }>> {
  const r = (await createExpense(formData)) as CreateExpenseResult & {
    fieldErrors?: Record<string, string[] | undefined>
  }
  if (r && 'error' in r && r.error) {
    return { error: r.error, fieldErrors: r.fieldErrors }
  }
  if (r && 'expenseId' in r && r.expenseId) {
    return { ok: true, data: { expenseId: r.expenseId } }
  }
  return { ok: true }
}

export function NewExpenseForm() {
  const router = useRouter()
  const { state, dispatch, pending } = useActionForm(action, {
    successMessage: 'Expense draft created',
    onSuccess: (s) => {
      if (s.data?.expenseId) router.push(`/expenses/${s.data.expenseId}`)
    },
  })

  return (
    <Form action={dispatch} pending={pending} className="space-y-3">
      <Field label="Category" error={fieldError(state, 'category')}>
        <Select name="category" defaultValue="travel" invalid={Boolean(fieldError(state, 'category'))}>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
      </Field>
      <Field label="Amount" required error={fieldError(state, 'amount')}>
        <Input type="number" name="amount" step="0.01" min="0.01" required invalid={Boolean(fieldError(state, 'amount'))} />
      </Field>
      <Field label="Currency" error={fieldError(state, 'currency')}>
        <Input name="currency" defaultValue="USD" maxLength={3} invalid={Boolean(fieldError(state, 'currency'))} />
      </Field>
      <Field label="Date" required error={fieldError(state, 'expenseDate')}>
        <Input type="date" name="expenseDate" required invalid={Boolean(fieldError(state, 'expenseDate'))} />
      </Field>
      <Field label="Description" error={fieldError(state, 'description')}>
        <Textarea
          name="description"
          rows={3}
          placeholder="What was this for?"
          invalid={Boolean(fieldError(state, 'description'))}
        />
      </Field>
      {state?.error && !state.fieldErrors && (
        <p className="text-sm text-rose-600" role="alert">{state.error}</p>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? 'Creating…' : 'Create draft'}
      </Button>
    </Form>
  )
}
