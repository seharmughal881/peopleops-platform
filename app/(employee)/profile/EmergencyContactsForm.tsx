'use client'

import { useState } from 'react'
import { setMyEmergencyContacts } from '@/lib/modules/employee/contacts'
import { type EmergencyContact } from '@/lib/modules/employee/contacts-schema'
import { Button } from '@/lib/ui/Button'
import { Input } from '@/lib/ui/Input'
import { Form, useActionForm, type ActionState } from '@/lib/ui/Form'

type Row = EmergencyContact

async function action(
  _prev: ActionState<{ count: number }> | undefined,
  formData: FormData,
): Promise<ActionState<{ count: number }>> {
  const r = await setMyEmergencyContacts(formData)
  if (r && 'error' in r && r.error) {
    return { error: r.error }
  }
  if (r && 'count' in r && typeof r.count === 'number') {
    return { ok: true, data: { count: r.count } }
  }
  return { ok: true }
}

export function EmergencyContactsForm({ defaults }: { defaults: Row[] }) {
  const [rows, setRows] = useState<Row[]>(
    defaults.length > 0 ? defaults : [{ name: '', relation: '', phone: '' }],
  )
  const { state, dispatch, pending } = useActionForm(action, {
    successMessage: 'Emergency contacts saved',
  })

  function update(i: number, field: keyof Row, v: string) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [field]: v } : r)))
  }
  function addRow() {
    setRows((rs) => [...rs, { name: '', relation: '', phone: '' }])
  }
  function removeRow(i: number) {
    setRows((rs) => rs.filter((_, idx) => idx !== i))
  }

  return (
    <Form action={dispatch} pending={pending} className="space-y-3">
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
            <Input
              name="name"
              placeholder="Name"
              value={r.name}
              onChange={(e) => update(i, 'name', e.target.value)}
            />
            <Input
              name="relation"
              placeholder="Relation"
              value={r.relation}
              onChange={(e) => update(i, 'relation', e.target.value)}
            />
            <Input
              name="phone"
              placeholder="Phone"
              value={r.phone}
              onChange={(e) => update(i, 'phone', e.target.value)}
            />
            <button
              type="button"
              onClick={() => removeRow(i)}
              className="text-sm text-rose-600 hover:underline"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={addRow}
          className="text-sm text-accent-deep hover:underline"
        >
          + Add contact
        </button>
      </div>
      {state?.error && (
        <p className="text-sm text-rose-600" role="alert">{state.error}</p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Save contacts'}
      </Button>
    </Form>
  )
}
