'use client'

import { useTransition } from 'react'
import { updateMyDiversity, clearMyDiversity } from '@/lib/modules/diversity/actions'
import {
  GENDER_OPTIONS,
  ETHNICITY_OPTIONS,
  VETERAN_OPTIONS,
  DISABILITY_OPTIONS,
} from '@/lib/modules/diversity/schemas'
import { Button } from '@/lib/ui/Button'
import { Field, Input, Select } from '@/lib/ui/Input'
import { Form, fieldError, useActionForm, type ActionState } from '@/lib/ui/Form'
import { toastError, toastSuccess } from '@/lib/ui/toast'

export type DiversityDefaults = {
  gender: string
  pronouns: string
  ethnicity: string
  veteranStatus: string
  disabilityStatus: string
}

async function action(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const r = await updateMyDiversity(formData)
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

export function DiversityForm({ defaults }: { defaults: DiversityDefaults }) {
  const { state, dispatch, pending } = useActionForm(action, {
    successMessage: 'Saved',
  })
  const [clearing, startClearing] = useTransition()

  function onClear() {
    if (!confirm('Remove all diversity information from your profile?')) return
    startClearing(async () => {
      const r = await clearMyDiversity()
      if (r?.error) toastError(r.error)
      else toastSuccess('Cleared')
    })
  }

  const busy = pending || clearing

  return (
    <Form action={dispatch} pending={pending} className="space-y-4">
      <p className="text-xs text-foreground-muted">
        These fields are <strong>voluntary and confidential</strong>. They are visible only to you and aggregated for reporting; individual responses are never shown. Leave any field blank to skip.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Gender" error={fieldError(state, 'gender')}>
          <Select name="gender" defaultValue={defaults.gender} invalid={Boolean(fieldError(state, 'gender'))}>
            <option value="">— Select —</option>
            {GENDER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </Field>
        <Field label="Pronouns" hint="e.g. she/her, they/them" error={fieldError(state, 'pronouns')}>
          <Input name="pronouns" defaultValue={defaults.pronouns} maxLength={40} invalid={Boolean(fieldError(state, 'pronouns'))} />
        </Field>
        <Field label="Race / ethnicity" error={fieldError(state, 'ethnicity')}>
          <Select name="ethnicity" defaultValue={defaults.ethnicity} invalid={Boolean(fieldError(state, 'ethnicity'))}>
            <option value="">— Select —</option>
            {ETHNICITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </Field>
        <Field label="Veteran status" error={fieldError(state, 'veteranStatus')}>
          <Select name="veteranStatus" defaultValue={defaults.veteranStatus} invalid={Boolean(fieldError(state, 'veteranStatus'))}>
            <option value="">— Select —</option>
            {VETERAN_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </Field>
        <Field label="Disability status" error={fieldError(state, 'disabilityStatus')}>
          <Select name="disabilityStatus" defaultValue={defaults.disabilityStatus} invalid={Boolean(fieldError(state, 'disabilityStatus'))}>
            <option value="">— Select —</option>
            {DISABILITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </Field>
      </div>
      {state?.error && !state.fieldErrors && (
        <p className="text-sm text-rose-600" role="alert">{state.error}</p>
      )}
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={busy}>{pending ? 'Saving…' : 'Save'}</Button>
        <button
          type="button"
          onClick={onClear}
          disabled={busy}
          className="text-sm text-rose-600 hover:underline disabled:opacity-50"
        >
          {clearing ? 'Clearing…' : 'Clear all'}
        </button>
      </div>
    </Form>
  )
}
