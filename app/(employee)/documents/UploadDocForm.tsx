'use client'

import { useRef } from 'react'
import { uploadDocument } from '@/lib/modules/employee/documents'
import { Button } from '@/lib/ui/Button'
import { Field, Input, Select } from '@/lib/ui/Input'
import { Form, fieldError, useActionForm, type ActionState } from '@/lib/ui/Form'

async function action(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const r = await uploadDocument(formData)
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

export function UploadDocForm({ employeeId }: { employeeId: string }) {
  const formRef = useRef<HTMLFormElement | null>(null)
  const { state, dispatch, pending } = useActionForm(action, {
    successMessage: 'Document uploaded',
    onSuccess: () => formRef.current?.reset(),
  })

  return (
    <Form ref={formRef} action={dispatch} pending={pending} className="space-y-3">
      <input type="hidden" name="employeeId" value={employeeId} />
      <Field label="Type" error={fieldError(state, 'type')}>
        <Select name="type" defaultValue="other" invalid={Boolean(fieldError(state, 'type'))}>
          <option value="contract">Contract</option>
          <option value="id">ID document</option>
          <option value="certification">Certification</option>
          <option value="other">Other</option>
        </Select>
      </Field>
      <Field label="File" required error={fieldError(state, 'file')}>
        <Input
          type="file"
          name="file"
          required
          accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
          invalid={Boolean(fieldError(state, 'file'))}
        />
      </Field>
      <Field label="Expires (optional)" error={fieldError(state, 'expiresAt')}>
        <Input type="date" name="expiresAt" invalid={Boolean(fieldError(state, 'expiresAt'))} />
      </Field>
      {state?.error && !state.fieldErrors && (
        <p className="text-sm text-rose-600" role="alert">{state.error}</p>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? 'Uploading…' : 'Upload'}
      </Button>
    </Form>
  )
}
