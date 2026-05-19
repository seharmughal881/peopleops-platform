'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { submitSurveyResponse } from '@/lib/modules/comms/surveys'
import type { SurveyQuestion } from '@/lib/modules/comms/schemas'
import { Button } from '@/lib/ui/Button'
import { Field, Textarea, Select } from '@/lib/ui/Input'

export function SurveyForm({ surveyId, questions }: { surveyId: string; questions: SurveyQuestion[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function onSubmit(formData: FormData) {
    setError(null)
    formData.set('surveyId', surveyId)
    startTransition(async () => {
      const r = await submitSurveyResponse(formData)
      if (r?.error) setError(r.error)
      else router.push('/surveys')
    })
  }

  return (
    <form action={onSubmit} className="space-y-4">
      {questions.map((q) => (
        <Field key={q.id} label={q.label} required={q.required}>
          {q.kind === 'rating' ? (
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <label key={n} className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent has-[:checked]:text-accent-foreground">
                  <input type="radio" name={q.id} value={n} className="sr-only" defaultChecked={n === 3} required={q.required} />
                  {n}
                </label>
              ))}
            </div>
          ) : q.kind === 'choice' ? (
            <Select name={q.id} required={q.required} defaultValue="">
              <option value="" disabled>— Choose —</option>
              {(q.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
            </Select>
          ) : (
            <Textarea name={q.id} rows={3} required={q.required} maxLength={4000} />
          )}
        </Field>
      ))}
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <Button type="submit" disabled={pending}>{pending ? 'Submitting…' : 'Submit response'}</Button>
    </form>
  )
}
