'use client'

import { useRef, useState, useTransition } from 'react'
import { createPIP } from '@/lib/modules/performance/pips'
import { Button } from '@/lib/ui/Button'
import { Field, Input, Select, Textarea } from '@/lib/ui/Input'

interface Props {
  reports: { id: string; firstName: string; lastName: string; employeeCode: string }[]
}

export function NewPIPForm({ reports }: Props) {
  const formRef = useRef<HTMLFormElement | null>(null)
  const [goals, setGoals] = useState<Array<{ title: string; dueDate: string }>>([{ title: '', dueDate: '' }])
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  function onSubmit(formData: FormData) {
    setError(null); setMessage(null)
    formData.delete('goalTitle'); formData.delete('goalDueDate')
    for (const g of goals) {
      formData.append('goalTitle', g.title)
      formData.append('goalDueDate', g.dueDate)
    }
    startTransition(async () => {
      const r = await createPIP(formData)
      if (r?.error) setError(r.error)
      else {
        setMessage('PIP opened.')
        formRef.current?.reset()
        setGoals([{ title: '', dueDate: '' }])
      }
    })
  }

  return (
    <form ref={formRef} action={onSubmit} className="space-y-3">
      <Field label="Subject">
        <Select name="subjectId" required defaultValue="">
          <option value="" disabled>— Select —</option>
          {reports.map((r) => <option key={r.id} value={r.id}>{r.firstName} {r.lastName}</option>)}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Start date"><Input type="date" name="startDate" required /></Field>
        <Field label="End date"><Input type="date" name="endDate" required /></Field>
      </div>
      <Field label="Reason"><Textarea name="reason" rows={3} required /></Field>
      <div>
        <p className="mb-1 text-sm font-medium">Goals</p>
        <div className="space-y-2">
          {goals.map((g, i) => (
            <div key={i} className="grid grid-cols-[2fr_1fr_auto] gap-2">
              <Input
                placeholder="Goal title"
                value={g.title}
                onChange={(e) => setGoals((arr) => arr.map((x, idx) => idx === i ? { ...x, title: e.target.value } : x))}
              />
              <Input
                type="date"
                value={g.dueDate}
                onChange={(e) => setGoals((arr) => arr.map((x, idx) => idx === i ? { ...x, dueDate: e.target.value } : x))}
              />
              <button type="button" onClick={() => setGoals((arr) => arr.filter((_, idx) => idx !== i))} className="text-rose-600 text-sm">×</button>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setGoals((arr) => [...arr, { title: '', dueDate: '' }])} className="mt-2 text-sm text-accent-deep">+ Add goal</button>
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      {message && <p className="text-sm text-emerald-600">{message}</p>}
      <Button type="submit" disabled={pending} className="w-full">{pending ? 'Opening…' : 'Open PIP'}</Button>
    </form>
  )
}
