'use client'

import { useRef } from 'react'
import { giveRecognition } from '@/lib/modules/comms/recognition'
import { Button } from '@/lib/ui/Button'
import { Field, Select, Textarea } from '@/lib/ui/Input'
import { Form, fieldError, useActionForm, type ActionState } from '@/lib/ui/Form'

interface Props {
  peers: { id: string; firstName: string; lastName: string; employeeCode: string }[]
}

async function action(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const r = await giveRecognition(formData)
  if (r && 'error' in r && r.error) {
    return {
      error: r.error,
      fieldErrors:
        'fieldErrors' in r
          ? (r.fieldErrors as Record<string, string[] | undefined> | undefined)
          : undefined,
    }
  }
  return { ok: true }
}

export function GiveRecognitionForm({ peers }: Props) {
  const formRef = useRef<HTMLFormElement | null>(null)
  const { state, dispatch, pending } = useActionForm(action, {
    successMessage: 'Recognition sent',
    onSuccess: () => formRef.current?.reset(),
  })

  return (
    <Form ref={formRef} action={dispatch} pending={pending} className="space-y-3">
      <Field label="To" required error={fieldError(state, 'toEmployeeId')}>
        <Select
          name="toEmployeeId"
          required
          defaultValue=""
          invalid={Boolean(fieldError(state, 'toEmployeeId'))}
        >
          <option value="" disabled>— Select teammate —</option>
          {peers.map((p) => (
            <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
          ))}
        </Select>
      </Field>
      <Field label="Category" error={fieldError(state, 'category')}>
        <Select name="category" defaultValue="kudos" invalid={Boolean(fieldError(state, 'category'))}>
          <option value="kudos">Kudos</option>
          <option value="thanks">Thanks</option>
          <option value="achievement">Achievement</option>
          <option value="teamwork">Teamwork</option>
        </Select>
      </Field>
      <Field label="Message" required error={fieldError(state, 'message')}>
        <Textarea
          name="message"
          rows={3}
          required
          maxLength={2000}
          invalid={Boolean(fieldError(state, 'message'))}
        />
      </Field>
      <Field label="Visibility" error={fieldError(state, 'visibility')}>
        <Select name="visibility" defaultValue="public" invalid={Boolean(fieldError(state, 'visibility'))}>
          <option value="public">Public (feed)</option>
          <option value="team">Private (recipient only)</option>
        </Select>
      </Field>
      {state?.error && !state.fieldErrors && (
        <p className="text-sm text-rose-600" role="alert">{state.error}</p>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? 'Sending…' : 'Send recognition'}
      </Button>
    </Form>
  )
}
