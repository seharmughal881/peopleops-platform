'use client'

import { useRef, useState, useTransition } from 'react'
import { createDevice } from '@/lib/modules/integrations/biometric-actions'
import { Button } from '@/lib/ui/Button'
import { Field, Input, Select } from '@/lib/ui/Input'

export function NewDeviceForm() {
  const formRef = useRef<HTMLFormElement | null>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)

  function onSubmit(formData: FormData) {
    setError(null); setSecret(null)
    startTransition(async () => {
      const r = await createDevice(formData)
      if (r?.error) setError(r.error)
      else if (r?.secret) {
        setSecret(r.secret)
        formRef.current?.reset()
      }
    })
  }

  return (
    <div className="space-y-3">
      <form ref={formRef} action={onSubmit} className="space-y-3">
        <Field label="Display name" required>
          <Input name="name" required maxLength={120} placeholder="Lobby fingerprint reader" />
        </Field>
        <Field label="Location">
          <Input name="location" maxLength={200} placeholder="HQ — Floor 1" />
        </Field>
        <Field label="Vendor">
          <Select name="vendor" defaultValue="generic">
            <option value="generic">Generic (custom JSON)</option>
            <option value="zkteco">ZKTeco</option>
            <option value="suprema">Suprema</option>
            <option value="hikvision">Hikvision</option>
          </Select>
        </Field>
        <Field label="External device ID" required hint="Unique ID the device sends in x-biometric-device-id header.">
          <Input name="externalDeviceId" required maxLength={120} placeholder="HQ-FP-001" />
        </Field>
        {error && <p className="text-xs text-rose-600">{error}</p>}
        <Button type="submit" disabled={pending} className="w-full">{pending ? 'Registering…' : 'Register device'}</Button>
      </form>

      {secret && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs dark:border-amber-700 dark:bg-amber-950/40">
          <p className="font-medium text-amber-800 dark:text-amber-300">Save this secret now — it cannot be shown again.</p>
          <code className="mt-2 block break-all rounded bg-amber-100 p-2 font-mono text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">{secret}</code>
          <p className="mt-2 text-amber-700 dark:text-amber-400">
            Configure the device to send <code>Authorization: Bearer &lt;secret&gt;</code> on every webhook call.
          </p>
        </div>
      )}
    </div>
  )
}
