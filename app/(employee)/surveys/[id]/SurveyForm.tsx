'use client'

import { useRouter } from 'next/navigation'
import { submitSurveyResponse } from '@/lib/modules/comms/surveys'
import type { SurveyQuestion } from '@/lib/modules/comms/schemas'
import { Button } from '@/lib/ui/Button'
import { Field, Textarea, Select } from '@/lib/ui/Input'
import { Form, useActionForm, type ActionState } from '@/lib/ui/Form'

async function action(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const r = await submitSurveyResponse(formData)
  if (r && 'error' in r && r.error) {
    return { error: r.error }
  }
  return { ok: true }
}

export function SurveyForm({ surveyId, questions }: { surveyId: string; questions: SurveyQuestion[] }) {
  const router = useRouter()
  const { state, dispatch, pending } = useActionForm(action, {
    successMessage: 'Response submitted',
    onSuccess: () => router.push('/surveys'),
  })

  return (
    <Form action={dispatch} pending={pending} className="space-y-4">
      <input type="hidden" name="surveyId" value={surveyId} />
      {questions.map((q) => (
        <Field key={q.id} label={q.label} required={q.required}>
          {q.kind === 'rating' ? (
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <label
                  key={n}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent has-[:checked]:text-accent-foreground"
                >
                  <input
                    type="radio"
                    name={q.id}
                    value={n}
                    className="sr-only"
                    defaultChecked={n === 3}
                    required={q.required}
                  />
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
      {state?.error && (
        <p className="text-sm text-rose-600" role="alert">{state.error}</p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? 'Submitting…' : 'Submit response'}
      </Button>
    </Form>
  )
}
