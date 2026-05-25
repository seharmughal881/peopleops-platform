import Link from 'next/link'
import { requireUser } from '@/lib/modules/auth'
import { prisma } from '@/lib/db/client'
import { Card, CardHeader } from '@/lib/ui/Card'
import { Table, THead, TR, TH, TD, Badge } from '@/lib/ui/Table'
import { listLeaveRequests } from '@/lib/modules/leave'
import { EditLeaveForm } from '@/app/(admin)/admin/leave/EditLeaveForm'

const STATUSES = ['pending', 'approved', 'rejected', 'cancelled']

function toneFor(status: string): 'success' | 'danger' | 'warn' | 'neutral' | 'info' {
  if (status === 'approved') return 'success'
  if (status === 'rejected' || status === 'cancelled') return 'danger'
  if (status === 'pending') return 'warn'
  return 'neutral'
}

function ymd(d: Date | string): string {
  return new Date(d).toISOString().slice(0, 10)
}

export default async function ManagerLeavePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await requireUser()
  if (!user.employee) {
    return <Card><CardHeader title="Team leave" subtitle="No employee record on file." /></Card>
  }

  const reports = await prisma.employee.findMany({
    where: { managerId: user.employee.id },
    select: { id: true },
  })
  const employeeIds = reports.map((r) => r.id)

  const params = await searchParams
  const status = typeof params.status === 'string' ? params.status : undefined
  const autoOnly = params.auto === '1'

  if (employeeIds.length === 0) {
    return (
      <Card>
        <CardHeader title="Team leave" subtitle="You have no direct reports yet." />
      </Card>
    )
  }

  const requests = await listLeaveRequests({ status, autoOnly, employeeIds, limit: 200 })

  return (
    <Card>
      <CardHeader
        title="Team leave"
        subtitle={`${requests.length} request${requests.length === 1 ? '' : 's'}${autoOnly ? ' • auto-created only' : ''}`}
        action={
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <FilterLink label="All" href="/manager/leave" active={!status && !autoOnly} />
            {STATUSES.map((s) => (
              <FilterLink key={s} label={s} href={`/manager/leave?status=${s}`} active={status === s} />
            ))}
            <span className="mx-1 text-foreground-subtle">|</span>
            <FilterLink label="Auto-created" href="/manager/leave?auto=1" active={autoOnly} />
          </div>
        }
      />
      <Table>
        <THead>
          <TR>
            <TH>Employee</TH>
            <TH>Type</TH>
            <TH>Dates</TH>
            <TH>Days</TH>
            <TH>Status</TH>
            <TH>Reason</TH>
            <TH>Source</TH>
            <TH>Submitted</TH>
            <TH>Action</TH>
          </TR>
        </THead>
        <tbody>
          {requests.length === 0 && (
            <TR><TD>No leave requests match these filters.</TD></TR>
          )}
          {requests.map((r) => (
            <TR key={r.id}>
              <TD>
                {r.employee.firstName} {r.employee.lastName}
                <div className="text-xs text-foreground-muted">{r.employee.employeeCode}</div>
              </TD>
              <TD><Badge tone="info">{r.leaveType}</Badge></TD>
              <TD>{ymd(r.startDate)} – {ymd(r.endDate)}</TD>
              <TD>{r.days}</TD>
              <TD><Badge tone={toneFor(r.status)}>{r.status}</Badge></TD>
              <TD className="max-w-xs truncate">{r.reason ?? '—'}</TD>
              <TD>
                {r.autoCreated
                  ? <Badge tone="warn">auto</Badge>
                  : <span className="text-foreground-muted">manual</span>}
              </TD>
              <TD>{new Date(r.createdAt).toLocaleDateString()}</TD>
              <TD>
                <EditLeaveForm
                  id={r.id}
                  leaveType={r.leaveType}
                  startDate={ymd(r.startDate)}
                  endDate={ymd(r.endDate)}
                  reason={r.reason}
                  status={r.status}
                />
              </TD>
            </TR>
          ))}
        </tbody>
      </Table>
    </Card>
  )
}

function FilterLink({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`inline-flex h-7 items-center rounded-md border px-2 text-xs font-medium transition-colors ${
        active
          ? 'border-accent-deep bg-accent-deep text-accent-foreground'
          : 'border-border bg-surface text-foreground hover:bg-surface-muted'
      }`}
    >
      {label}
    </Link>
  )
}
