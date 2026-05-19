'use client'

import { useRef, useState, useTransition } from 'react'
import { createGoal } from '@/lib/modules/performance/goals'
import { Button } from '@/lib/ui/Button'
import { Field, Input, Select, Textarea } from '@/lib/ui/Input'

export function NewGoalForm({ employeeId }: { employeeId: string }) {
  const formRef = useRef<HTMLFormElement | null>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function onSubmit(formData: FormData) {
    setError(null)
    formData.set('employeeId', employeeId)
    startTransition(async () => {
      const r = await createGoal(formData)
      if (r?.error) setError(r.error)
      else formRef.current?.reset()
    })
  }

  return (
    <form ref={formRef} action={onSubmit} className="space-y-3">
      <Field label="Title"><Input name="title" required maxLength={200} /></Field>
      <Field label="Description"><Textarea name="description" rows={3} /></Field>
      <Field label="Type">
        <Select name="type" defaultValue="objective">
          <option value="objective">Objective</option>
          <option value="keyResult">Key result</option>
          <option value="personal">Personal</option>
        </Select>
      </Field>
      <Field label="Target date"><Input type="date" name="targetDate" /></Field>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <Button type="submit" disabled={pending} className="w-full">{pending ? 'Creating…' : 'Create goal'}</Button>
    </form>
  )
}
