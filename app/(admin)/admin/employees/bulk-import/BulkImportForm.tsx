'use client'

import { useState, useTransition } from 'react'
import {
  bulkImportEmployees,
  type BulkImportResult,
} from '@/lib/modules/employee/bulk-import'

const CSV_TEMPLATE = [
  'email,firstName,lastName,employeeCode,joinDate,jobTitle,departmentName,managerEmail',
  'jane.doe@example.com,Jane,Doe,EMP-100,2026-01-15,Engineer,Engineering,manager@example.com',
  'john.roe@example.com,John,Roe,EMP-101,2026-02-01,Designer,Design,',
].join('\n')

export function BulkImportForm() {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<BulkImportResult | null>(null)
  const [fileName, setFileName] = useState<string>('')

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setResult(null)
    startTransition(async () => {
      const r = await bulkImportEmployees(fd)
      setResult(r)
    })
  }

  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'employees-template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border bg-surface-muted/40 p-4 text-sm">
        <p className="font-medium text-foreground">Required columns</p>
        <p className="mt-1 font-mono text-[12px] text-foreground-muted">
          email, firstName, lastName, employeeCode, joinDate
        </p>
        <p className="mt-2 font-medium text-foreground">Optional columns</p>
        <p className="mt-1 font-mono text-[12px] text-foreground-muted">
          jobTitle, departmentName, managerEmail
        </p>
        <button
          type="button"
          onClick={downloadTemplate}
          className="mt-3 text-xs text-accent hover:underline"
        >
          ↓ Download CSV template
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <label className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-border bg-surface px-4 py-6 text-sm transition-colors hover:border-border-strong">
          <input
            type="file"
            name="file"
            accept=".csv,text/csv"
            required
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? '')}
            className="block w-full text-sm text-foreground file:mr-4 file:rounded-md file:border-0 file:bg-accent-subtle file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-accent hover:file:bg-accent-subtle/80"
          />
        </label>
        {fileName && (
          <p className="text-xs text-foreground-muted">
            Selected: <span className="font-mono">{fileName}</span>
          </p>
        )}

        <div className="flex flex-wrap items-center gap-4 text-sm">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" name="dryRun" value="1" defaultChecked />
            <span>Dry-run (validate only, don&apos;t create)</span>
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" name="sendInvites" value="1" />
            <span>Email invites to created users</span>
          </label>
        </div>

        <div>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-opacity disabled:opacity-50"
          >
            {isPending ? 'Importing…' : 'Import'}
          </button>
        </div>
      </form>

      {result && <Results result={result} />}
    </div>
  )
}

function Results({ result }: { result: BulkImportResult }) {
  if (!result.ok) {
    return (
      <div className="rounded-md border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800">
        {result.error}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Created" value={result.created} tone="success" />
        <Stat label="Skipped" value={result.skipped} tone="warn" />
        <Stat label="Errors" value={result.errors} tone="danger" />
      </div>

      <div className="overflow-hidden rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface-muted text-left text-[11px] uppercase tracking-wider text-foreground-subtle">
            <tr>
              <th className="px-3 py-2 font-medium">Row</th>
              <th className="px-3 py-2 font-medium">Email</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {result.rows.map((r) => (
              <tr key={`${r.row}-${r.email ?? ''}`}>
                <td className="px-3 py-2 font-mono text-[12px]">{r.row}</td>
                <td className="px-3 py-2">{r.email ?? '—'}</td>
                <td className="px-3 py-2">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-3 py-2 text-foreground-muted">
                  {r.tempPassword ? (
                    <span>
                      Temp password:{' '}
                      <code className="rounded bg-surface-muted px-1 py-0.5 font-mono text-[12px] text-foreground">
                        {r.tempPassword}
                      </code>
                    </span>
                  ) : (
                    r.message ?? ''
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {result.rows.some((r) => r.tempPassword) && (
        <p className="text-xs text-foreground-subtle">
          Temp passwords are shown once. Copy them now or use the password-reset flow later.
        </p>
      )}
    </div>
  )
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'success' | 'warn' | 'danger'
}) {
  const toneCls =
    tone === 'success'
      ? 'text-emerald-600'
      : tone === 'warn'
        ? 'text-amber-600'
        : 'text-rose-600'
  return (
    <div className="rounded-md border border-border bg-surface px-4 py-3">
      <p className="text-[11px] uppercase tracking-wider text-foreground-subtle">{label}</p>
      <p className={`mt-0.5 text-2xl font-semibold ${toneCls}`}>{value}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: 'created' | 'skipped' | 'error' }) {
  const styles = {
    created: 'border-emerald-300 bg-emerald-50 text-emerald-800',
    skipped: 'border-amber-300 bg-amber-50 text-amber-800',
    error: 'border-rose-300 bg-rose-50 text-rose-800',
  }[status]
  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wider ${styles}`}
    >
      {status}
    </span>
  )
}
