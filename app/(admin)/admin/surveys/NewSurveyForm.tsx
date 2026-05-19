'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createSurvey } from '@/lib/modules/comms/surveys'
import { Button } from '@/lib/ui/Button'
import { Field, Input, Select, Textarea } from '@/lib/ui/Input'

type Q = { label: string; kind: 'rating' | 'text' | 'choice'; options: string }

export function NewSurveyForm() {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement | null>(null)
  const [questions, setQuestions] = useState<Q[]>([{ label: '', kind: 'rating', options: '' }])
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function onSubmit(formData: FormData) {
    setError(null)
    formData.delete('qLabel'); formData.delete('qKind'); formData.delete('qOptions')
    for (const q of questions) {
      formData.append('qLabel', q.label)
      formData.append('qKind', q.kind)
      formData.append('qOptions', q.options)
    }
    startTransition(async () => {
      const r = await createSurvey(formData)
      if (r?.error) setError(r.error)
      else if (r?.surveyId) {
        formRef.current?.reset()
        setQuestions([{ label: '', kind: 'rating', options: '' }])
        router.refresh()
      }
    })
  }

  return (
    <form ref={formRef} action={onSubmit} className="space-y-3">
      <Field label="Title" required><Input name="title" required /></Field>
      <Field label="Description"><Textarea name="description" rows={2} /></Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="anonymous" />
        Anonymous responses
      </label>
      <div className="space-y-2">
        <p className="text-sm font-medium">Questions</p>
        {questions.map((q, i) => (
          <div key={i} className="rounded-md border border-border p-3 space-y-2">
            <div className="grid grid-cols-[2fr_1fr_auto] gap-2">
              <Input
                placeholder="Question label"
                value={q.label}
                onChange={(e) => setQuestions((arr) => arr.map((x, idx) => idx === i ? { ...x, label: e.target.value } : x))}
              />
              <Select
                value={q.kind}
                onChange={(e) => setQuestions((arr) => arr.map((x, idx) => idx === i ? { ...x, kind: e.target.value as Q['kind'] } : x))}
              >
                <option value="rating">Rating 1-5</option>
                <option value="text">Free text</option>
                <option value="choice">Multiple choice</option>
              </Select>
              <button type="button" onClick={() => setQuestions((arr) => arr.filter((_, idx) => idx !== i))} className="text-sm text-rose-600">×</button>
            </div>
            {q.kind === 'choice' && (
              <Input
                placeholder="Options, comma-separated"
                value={q.options}
                onChange={(e) => setQuestions((arr) => arr.map((x, idx) => idx === i ? { ...x, options: e.target.value } : x))}
              />
            )}
          </div>
        ))}
        <button type="button" onClick={() => setQuestions((arr) => [...arr, { label: '', kind: 'rating', options: '' }])} className="text-sm text-accent hover:underline">+ Add question</button>
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <Button type="submit" disabled={pending} className="w-full">{pending ? 'Creating…' : 'Create survey'}</Button>
    </form>
  )
}
