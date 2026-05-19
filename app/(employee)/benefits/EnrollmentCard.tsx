'use client'

import { useRef, useState, useTransition } from 'react'
import {
  addDependent,
  removeDependent,
  changeCoverageLevel,
  terminateEnrollment,
  COVERAGE_LEVELS,
  DEPENDENT_RELATIONS,
} from '@/lib/modules/benefits'
import { Button } from '@/lib/ui/Button'
import { Field, Input, Select } from '@/lib/ui/Input'
import { Badge } from '@/lib/ui/Table'

type Dependent = {
  id: string
  firstName: string
  lastName: string
  relation: string
  dob: string | null
}

type Enrollment = {
  id: string
  coverageLevel: string
  effectiveFrom: string
  plan: {
    name: string
    type: string
    monthlyPremium: number
    employerShare: number
    coversDependents: boolean
  }
  dependents: Dependent[]
}

export function EnrollmentCard({ enrollment }: { enrollment: Enrollment }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const formRef = useRef<HTMLFormElement | null>(null)
  const employerNet = enrollment.plan.monthlyPremium - enrollment.plan.employerShare
  const allowsDeps = enrollment.plan.coversDependents && enrollment.coverageLevel !== 'employee'

  function onCoverageChange(level: string) {
    setError(null)
    const fd = new FormData()
    fd.set('id', enrollment.id)
    fd.set('coverageLevel', level)
    startTransition(async () => {
      const r = await changeCoverageLevel(fd)
      if (r?.error) setError(r.error)
    })
  }

  function onAddDependent(formData: FormData) {
    setError(null)
    formData.set('enrollmentId', enrollment.id)
    startTransition(async () => {
      const r = await addDependent(formData)
      if (r?.error) setError(r.error)
      else {
        formRef.current?.reset()
        setAddOpen(false)
      }
    })
  }

  function onRemove(depId: string) {
    setError(null)
    const fd = new FormData()
    fd.set('id', depId)
    startTransition(async () => {
      const r = await removeDependent(fd)
      if (r?.error) setError(r.error)
    })
  }

  function onTerminate() {
    if (!confirm('Terminate this enrollment? This cannot be undone.')) return
    setError(null)
    const fd = new FormData()
    fd.set('id', enrollment.id)
    startTransition(async () => {
      const r = await terminateEnrollment(fd)
      if (r?.error) setError(r.error)
    })
  }

  return (
    <div className="rounded-md border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium">{enrollment.plan.name}</p>
            <Badge tone="neutral">{enrollment.plan.type}</Badge>
          </div>
          <p className="mt-1 text-xs text-foreground-muted">
            Effective {new Date(enrollment.effectiveFrom).toLocaleDateString()}
          </p>
          <p className="mt-2 text-sm">
            <span className="font-medium">${enrollment.plan.monthlyPremium.toFixed(2)}/mo</span>
            {enrollment.plan.employerShare > 0 && (
              <span className="text-foreground-muted"> · you pay ${employerNet.toFixed(2)}</span>
            )}
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          {enrollment.plan.coversDependents && (
            <Select
              defaultValue={enrollment.coverageLevel}
              onChange={(e) => onCoverageChange(e.currentTarget.value)}
              disabled={pending}
              className="h-8 text-xs"
            >
              {COVERAGE_LEVELS.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          )}
          <Button size="sm" variant="danger" onClick={onTerminate} disabled={pending}>
            Terminate
          </Button>
        </div>
      </div>

      {allowsDeps && (
        <div className="mt-3 border-t border-border pt-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium">
              Dependents{' '}
              <span className="text-xs text-foreground-muted">({enrollment.dependents.length})</span>
            </p>
            <button
              type="button"
              onClick={() => setAddOpen((v) => !v)}
              className="text-xs text-foreground-muted hover:underline"
            >
              {addOpen ? 'Cancel' : '+ Add dependent'}
            </button>
          </div>
          {enrollment.dependents.length === 0 && !addOpen && (
            <p className="text-xs text-foreground-muted">None added yet.</p>
          )}
          {enrollment.dependents.length > 0 && (
            <ul className="space-y-1 text-sm">
              {enrollment.dependents.map((d) => (
                <li key={d.id} className="flex items-center justify-between rounded-sm bg-surface-muted px-3 py-1.5">
                  <span>
                    {d.firstName} {d.lastName} <span className="text-xs text-foreground-muted">· {d.relation}</span>
                  </span>
                  <button onClick={() => onRemove(d.id)} disabled={pending} className="text-xs text-rose-600 hover:underline">
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
          {addOpen && (
            <form ref={formRef} action={onAddDependent} className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Field label="First name" required><Input name="firstName" required maxLength={80} /></Field>
              <Field label="Last name" required><Input name="lastName" required maxLength={80} /></Field>
              <Field label="Relation" required>
                <Select name="relation" defaultValue="spouse" required>
                  {DEPENDENT_RELATIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </Select>
              </Field>
              <Field label="Date of birth"><Input type="date" name="dob" /></Field>
              <div className="col-span-2 sm:col-span-4">
                <Button type="submit" disabled={pending} size="sm">
                  {pending ? 'Adding…' : 'Add dependent'}
                </Button>
              </div>
            </form>
          )}
        </div>
      )}
      {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
    </div>
  )
}
