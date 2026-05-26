'use client'

import { useState, useTransition } from 'react'
import { enroll, waivePlan } from '@/lib/modules/benefits/actions'
import { COVERAGE_LEVELS } from '@/lib/modules/benefits/schemas'
import { Button } from '@/lib/ui/Button'
import { Field, Select } from '@/lib/ui/Input'
import { Badge } from '@/lib/ui/Table'

type Plan = {
  id: string
  name: string
  type: string
  description: string | null
  monthlyPremium: number
  employerShare: number
  coversDependents: boolean
  enrollOpensAt: string | null
  enrollClosesAt: string | null
}

function enrollmentWindowLabel(plan: Plan): string | null {
  const now = Date.now()
  if (plan.enrollOpensAt && new Date(plan.enrollOpensAt).getTime() > now) {
    return `Opens ${new Date(plan.enrollOpensAt).toLocaleDateString()}`
  }
  if (plan.enrollClosesAt && new Date(plan.enrollClosesAt).getTime() < now) {
    return `Closed ${new Date(plan.enrollClosesAt).toLocaleDateString()}`
  }
  if (plan.enrollClosesAt) {
    return `Open until ${new Date(plan.enrollClosesAt).toLocaleDateString()}`
  }
  return 'Open enrollment'
}

function isWindowOpen(plan: Plan): boolean {
  const now = Date.now()
  if (plan.enrollOpensAt && new Date(plan.enrollOpensAt).getTime() > now) return false
  if (plan.enrollClosesAt && new Date(plan.enrollClosesAt).getTime() < now) return false
  return true
}

export function PlanRow({ plan, myStatus }: { plan: Plan; myStatus: string | null }) {
  const [expanded, setExpanded] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const employerNet = plan.monthlyPremium - plan.employerShare
  const open = isWindowOpen(plan)

  function onEnroll(formData: FormData) {
    setError(null)
    formData.set('planId', plan.id)
    startTransition(async () => {
      const r = await enroll(formData)
      if (r?.error) setError(r.error)
      else setExpanded(false)
    })
  }

  function onWaive() {
    setError(null)
    const fd = new FormData()
    fd.set('planId', plan.id)
    startTransition(async () => {
      const r = await waivePlan(fd)
      if (r?.error) setError(r.error)
    })
  }

  return (
    <div className="rounded-md border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium">{plan.name}</p>
            <Badge tone="neutral">{plan.type}</Badge>
            {myStatus && <Badge tone={myStatus === 'active' ? 'success' : 'warn'}>{myStatus}</Badge>}
          </div>
          {plan.description && (
            <p className="mt-1 text-sm text-foreground-muted">{plan.description}</p>
          )}
          <p className="mt-2 text-sm">
            <span className="font-medium">${plan.monthlyPremium.toFixed(2)}/mo</span>
            {plan.employerShare > 0 && (
              <span className="text-foreground-muted">
                {' '}· employer ${plan.employerShare.toFixed(2)}, you pay ${employerNet.toFixed(2)}
              </span>
            )}
          </p>
          <p className="mt-1 text-xs text-foreground-muted">{enrollmentWindowLabel(plan)}</p>
        </div>
        <div className="shrink-0 flex flex-col gap-2">
          {!myStatus && open && (
            <Button size="sm" onClick={() => setExpanded((v) => !v)} variant={expanded ? 'outline' : 'primary'}>
              {expanded ? 'Cancel' : 'Enroll'}
            </Button>
          )}
          {!myStatus && open && (
            <Button size="sm" variant="ghost" onClick={onWaive} disabled={pending}>
              Waive
            </Button>
          )}
          {!myStatus && !open && (
            <span className="text-xs text-foreground-muted">Enrollment closed</span>
          )}
        </div>
      </div>

      {expanded && (
        <form action={onEnroll} className="mt-4 grid grid-cols-1 gap-3 border-t border-border pt-4 sm:grid-cols-3">
          <Field label="Coverage level">
            <Select name="coverageLevel" defaultValue="employee">
              {COVERAGE_LEVELS.map((c) => (
                <option key={c} value={c} disabled={c !== 'employee' && !plan.coversDependents}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <div className="sm:col-span-2 flex items-end gap-2">
            <Button type="submit" disabled={pending}>{pending ? 'Enrolling…' : 'Confirm enrollment'}</Button>
            {error && <span className="text-sm text-rose-600">{error}</span>}
          </div>
        </form>
      )}
      {error && !expanded && <p className="mt-2 text-sm text-rose-600">{error}</p>}
    </div>
  )
}
