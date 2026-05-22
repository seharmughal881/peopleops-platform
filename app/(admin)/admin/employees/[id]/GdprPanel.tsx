'use client'

import { useState, useTransition } from 'react'
import { deleteEmployeeGdpr } from '@/lib/modules/compliance/actions'
import { Button } from '@/lib/ui/Button'
import { Card, CardHeader } from '@/lib/ui/Card'
import { Field, Input } from '@/lib/ui/Input'

export function GdprPanel({
  employeeId,
  employeeCode,
  employeeName,
}: {
  employeeId: string
  employeeCode: string
  employeeName: string
}) {
  const [deleting, setDeleting] = useState(false)
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function onDelete(formData: FormData) {
    setError(null)
    formData.set('id', employeeId)
    formData.set('confirm', confirm)
    startTransition(async () => {
      const r = await deleteEmployeeGdpr(formData)
      // deleteEmployeeGdpr redirects on success; if we get here, it failed
      if (r?.error) setError(r.error)
    })
  }

  return (
    <Card className="border-rose-500/30">
      <CardHeader
        title="GDPR — data portability & erasure"
        subtitle="Article 20 (export) and Article 17 (right to be forgotten)."
      />
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4 rounded-md border border-border bg-surface-muted p-4">
          <div>
            <p className="text-sm font-medium">Export all data</p>
            <p className="text-xs text-foreground-muted">
              Downloads a JSON file with everything we hold about this employee — profile, attendance, leave, payroll, performance, assets, recognitions, and audit-log entries (action + timestamp only).
            </p>
          </div>
          <a href={`/api/admin/gdpr/export/${employeeId}`}>
            <Button size="sm" variant="outline">Export JSON</Button>
          </a>
        </div>

        <div className="rounded-md border border-rose-500/30 bg-rose-50/30 p-4 dark:bg-rose-950/10">
          <p className="text-sm font-medium text-rose-700 dark:text-rose-400">Permanently delete employee</p>
          <p className="mt-1 text-xs text-foreground-muted">
            Hard-deletes the user + employee record and all related rows (profile, attendance, leave, documents, etc.).
            Audit log entries are kept but anonymised (the user reference is set to null). <strong>This cannot be undone.</strong>
          </p>

          {!deleting ? (
            <Button variant="danger" size="sm" onClick={() => setDeleting(true)} className="mt-3">
              Delete {employeeName} ({employeeCode})
            </Button>
          ) : (
            <form action={onDelete} className="mt-3 space-y-3">
              <Field
                label={`Type DELETE to confirm`}
                hint={`This will permanently remove ${employeeName} and all linked data.`}
              >
                <Input
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoFocus
                  placeholder="DELETE"
                />
              </Field>
              {error && <p className="text-sm text-rose-600">{error}</p>}
              <div className="flex gap-2">
                <Button type="submit" variant="danger" size="sm" disabled={pending || confirm !== 'DELETE'}>
                  {pending ? 'Deleting…' : 'Permanently delete'}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => { setDeleting(false); setConfirm(''); setError(null) }}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </Card>
  )
}
