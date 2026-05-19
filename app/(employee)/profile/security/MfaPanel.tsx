'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/lib/ui/Button'
import { Field, Input } from '@/lib/ui/Input'

type Stage = 'idle' | 'enrolling' | 'enabled'

interface EnrollData {
  secret: string
  otpauthUrl: string
  qrDataUrl: string
}

export function MfaPanel({ initiallyEnabled }: { initiallyEnabled: boolean }) {
  const [stage, setStage] = useState<Stage>(initiallyEnabled ? 'enabled' : 'idle')
  const [enroll, setEnroll] = useState<EnrollData | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function start() {
    setError(null)
    startTransition(async () => {
      const r = await fetch('/api/auth/mfa/enroll', { method: 'POST' })
      const data = await r.json()
      if (!r.ok) { setError(data.error ?? 'Failed to start enrollment'); return }
      setEnroll(data)
      setStage('enrolling')
    })
  }

  function verify() {
    setError(null)
    startTransition(async () => {
      const r = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await r.json()
      if (!r.ok) { setError(data.error ?? 'Invalid code'); return }
      setStage('enabled')
      setEnroll(null)
      setCode('')
    })
  }

  function disable() {
    setError(null)
    startTransition(async () => {
      const r = await fetch('/api/auth/mfa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code || undefined }),
      })
      const data = await r.json()
      if (!r.ok) { setError(data.error ?? 'Failed to disable'); return }
      setStage('idle')
      setCode('')
    })
  }

  if (stage === 'idle') {
    return (
      <div className="space-y-3">
        <p className="text-sm text-foreground-muted">
          Two-factor auth is currently off. Enabling it adds a 6-digit code requirement at every login.
        </p>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <Button onClick={start} disabled={pending}>{pending ? 'Starting…' : 'Enable two-factor auth'}</Button>
      </div>
    )
  }

  if (stage === 'enrolling' && enroll) {
    return (
      <div className="space-y-4">
        <ol className="list-decimal space-y-2 pl-5 text-sm">
          <li>Open your authenticator app and scan this QR code, or enter the secret manually.</li>
          <li>Then type the 6-digit code your app shows to confirm.</li>
        </ol>
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={enroll.qrDataUrl} alt="MFA QR code" className="rounded border border-border" />
          <div className="space-y-2 text-sm">
            <p className="text-foreground-muted">Secret (manual entry):</p>
            <code className="block break-all rounded bg-surface-muted px-2 py-1 font-mono text-xs">{enroll.secret}</code>
          </div>
        </div>
        <Field label="6-digit code from app" required>
          <Input
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123456"
          />
        </Field>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex gap-2">
          <Button onClick={verify} disabled={pending || code.length < 6}>
            {pending ? 'Verifying…' : 'Confirm and enable'}
          </Button>
          <Button variant="outline" onClick={() => { setStage('idle'); setEnroll(null); setCode('') }} disabled={pending}>
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-foreground-muted">
        Two-factor auth is active. You will need your authenticator app every time you sign in.
      </p>
      <Field label="Current 6-digit code (optional, recommended for confirmation)">
        <Input
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="123456"
        />
      </Field>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <Button variant="danger" onClick={disable} disabled={pending}>
        {pending ? 'Disabling…' : 'Disable two-factor auth'}
      </Button>
    </div>
  )
}
