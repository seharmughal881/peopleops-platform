'use client'

import { useState, useTransition } from 'react'
import { setMyEmergencyContacts } from '@/lib/modules/employee/contacts'
import { type EmergencyContact } from '@/lib/modules/employee/contacts-schema'
import { Button } from '@/lib/ui/Button'
import { Input } from '@/lib/ui/Input'

type Row = EmergencyContact

export function EmergencyContactsForm({ defaults }: { defaults: Row[] }) {
  const [rows, setRows] = useState<Row[]>(defaults.length > 0 ? defaults : [{ name: '', relation: '', phone: '' }])
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function update(i: number, field: keyof Row, v: string) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [field]: v } : r)))
  }
  function addRow() {
    setRows((rs) => [...rs, { name: '', relation: '', phone: '' }])
  }
  function removeRow(i: number) {
    setRows((rs) => rs.filter((_, idx) => idx !== i))
  }

  function onSubmit(formData: FormData) {
    setError(null); setMessage(null)
    formData.delete('name'); formData.delete('relation'); formData.delete('phone')
    for (const r of rows) {
      formData.append('name', r.name)
      formData.append('relation', r.relation)
      formData.append('phone', r.phone)
    }
    startTransition(async () => {
      const res = await setMyEmergencyContacts(formData)
      if (res?.error) setError(res.error)
      else setMessage(`Saved ${res?.count ?? 0} contact${res?.count === 1 ? '' : 's'}.`)
    })
  }

  return (
    <form action={onSubmit} className="space-y-3">
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
            <Input placeholder="Name" value={r.name} onChange={(e) => update(i, 'name', e.target.value)} />
            <Input placeholder="Relation" value={r.relation} onChange={(e) => update(i, 'relation', e.target.value)} />
            <Input placeholder="Phone" value={r.phone} onChange={(e) => update(i, 'phone', e.target.value)} />
            <button type="button" onClick={() => removeRow(i)} className="text-sm text-rose-600 hover:underline">
              Remove
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={addRow} className="text-sm text-accent-deep hover:underline">+ Add contact</button>
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      {message && <p className="text-sm text-emerald-600">{message}</p>}
      <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save contacts'}</Button>
    </form>
  )
}
