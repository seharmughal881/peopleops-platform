import Link from 'next/link'
import { Card, CardHeader, Stat } from '@/lib/ui/Card'
import { Table, THead, TR, TH, TD } from '@/lib/ui/Table'
import { Badge } from '@/lib/ui/Badge'
import {
  monthlyAttendanceInsights,
  monthlyLateCheckIns,
  monthlyOvertimeLogs,
  monthlyLeaveSummary,
} from '@/lib/modules/reporting'
import { prisma } from '@/lib/db/client'
import { startOfMonth, startOfNextMonth } from '@/lib/modules/reporting/_time'
import { ArrowLeftIcon } from '@/lib/ui/icons'

type View = 'late' | 'overtime' | 'leave'

const VIEWS: Array<{ key: View; label: string }> = [
  { key: 'late', label: 'Late check-ins' },
  { key: 'overtime', label: 'Overtime hours' },
  { key: 'leave', label: 'Approved leave' },
]

function resolveView(raw: string | undefined): View {
  return raw === 'overtime' || raw === 'leave' ? raw : 'late'
}

function ymd(d: Date | string): string {
  return new Date(d).toISOString().slice(0, 10)
}

function timeOfDay(d: Date): string {
  return new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
}

async function monthlyApprovedLeaves(ref: Date) {
  const start = startOfMonth(ref)
  const end = startOfNextMonth(ref)
  return prisma.leaveRequest.findMany({
    where: {
      status: 'approved',
      OR: [
        { startDate: { gte: start, lt: end } },
        { startDate: { lt: end }, endDate: { gte: start } },
      ],
    },
    include: {
      employee: {
        select: {
          firstName: true,
          lastName: true,
          employeeCode: true,
          department: { select: { name: true } },
        },
      },
    },
    orderBy: { startDate: 'desc' },
  })
}

export default async function ThisMonthDetailPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>
}) {
  const { view: viewRaw } = await searchParams
  const view = resolveView(viewRaw)
  const today = new Date()

  const [insights, leaveSummary] = await Promise.all([
    monthlyAttendanceInsights(today),
    monthlyLeaveSummary(today),
  ])

  const lateRows = view === 'late' ? await monthlyLateCheckIns(today) : []
  const overtimeRows = view === 'overtime' ? await monthlyOvertimeLogs(today) : []
  const leaveRows = view === 'leave' ? await monthlyApprovedLeaves(today) : []

  return (
    <div className="space-y-6">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1 text-sm text-foreground-muted hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        Back to dashboard
      </Link>

      <header>
        <h1 className="text-2xl font-semibold tracking-tight">This month · {insights.monthLabel}</h1>
        <p className="text-sm text-foreground-muted">
          Detailed employee-level breakdown for the current calendar month.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Approved leave" value={leaveSummary.approved} hint={`${leaveSummary.approvedDays} days`} />
        <Stat label="Late check-ins" value={insights.lateCount} hint={`${insights.totalLogs} total check-ins`} />
        <Stat label="Extra (overtime) hours" value={`${insights.overtimeHours}h`} hint={`${insights.missedCount} missed days`} />
      </div>

      <nav className="inline-flex rounded-md border border-border bg-surface p-0.5 text-xs" aria-label="View">
        {VIEWS.map((v) => {
          const active = v.key === view
          return (
            <Link
              key={v.key}
              href={`/admin/reports/this-month?view=${v.key}`}
              className={
                active
                  ? 'rounded px-3 py-1.5 font-semibold bg-[var(--accent)] text-[var(--accent-foreground)]'
                  : 'rounded px-3 py-1.5 text-foreground-muted hover:text-foreground'
              }
            >
              {v.label}
            </Link>
          )
        })}
      </nav>

      {view === 'late' && (
        <Card>
          <CardHeader
            title="Late check-ins this month"
            subtitle="Anyone who clocked in after 09:30"
            action={
              <span className="text-xs text-foreground-muted">
                {lateRows.length} {lateRows.length === 1 ? 'record' : 'records'}
              </span>
            }
          />
          {lateRows.length === 0 ? (
            <p className="text-sm text-foreground-muted">No late check-ins this month.</p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Employee</TH>
                  <TH>Department</TH>
                  <TH>Date</TH>
                  <TH>Check-in</TH>
                  <TH>Late by</TH>
                </TR>
              </THead>
              <tbody>
                {lateRows.map((r, i) => (
                  <TR key={`${r.employeeId}-${i}`}>
                    <TD>
                      <div className="font-medium">{r.name}</div>
                      <div className="text-xs text-foreground-muted">{r.employeeCode}</div>
                    </TD>
                    <TD className="text-foreground-muted">{r.department ?? '—'}</TD>
                    <TD>{ymd(r.clockIn)}</TD>
                    <TD className="text-amber-600">{timeOfDay(r.clockIn)}</TD>
                    <TD>
                      <Badge tone="warn">{r.minutesLate}m late</Badge>
                    </TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      )}

      {view === 'overtime' && (
        <Card>
          <CardHeader
            title="Overtime hours this month"
            subtitle="Logs with overtime past the standard workday"
            action={
              <span className="text-xs text-foreground-muted">
                {overtimeRows.length} {overtimeRows.length === 1 ? 'log' : 'logs'} · total{' '}
                {insights.overtimeHours}h
              </span>
            }
          />
          {overtimeRows.length === 0 ? (
            <p className="text-sm text-foreground-muted">No overtime logged this month.</p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Employee</TH>
                  <TH>Department</TH>
                  <TH>Date</TH>
                  <TH>Net hours</TH>
                  <TH>Overtime</TH>
                </TR>
              </THead>
              <tbody>
                {overtimeRows.map((r, i) => (
                  <TR key={`${r.employeeId}-${i}`}>
                    <TD>
                      <div className="font-medium">{r.name}</div>
                      <div className="text-xs text-foreground-muted">{r.employeeCode}</div>
                    </TD>
                    <TD className="text-foreground-muted">{r.department ?? '—'}</TD>
                    <TD>{ymd(r.clockIn)}</TD>
                    <TD>{r.netHours != null ? `${r.netHours.toFixed(1)}h` : '—'}</TD>
                    <TD>
                      <Badge tone="success">+{r.overtimeHours.toFixed(1)}h</Badge>
                    </TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      )}

      {view === 'leave' && (
        <Card>
          <CardHeader
            title="Approved leave this month"
            subtitle="Leave that overlaps with the current calendar month"
            action={
              <span className="text-xs text-foreground-muted">
                {leaveRows.length} {leaveRows.length === 1 ? 'request' : 'requests'} ·{' '}
                {leaveSummary.approvedDays} days
              </span>
            }
          />
          {leaveRows.length === 0 ? (
            <p className="text-sm text-foreground-muted">No approved leave this month.</p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Employee</TH>
                  <TH>Department</TH>
                  <TH>Type</TH>
                  <TH>Dates</TH>
                  <TH>Days</TH>
                  <TH>Reason</TH>
                </TR>
              </THead>
              <tbody>
                {leaveRows.map((r) => (
                  <TR key={r.id}>
                    <TD>
                      <div className="font-medium">
                        {r.employee.firstName} {r.employee.lastName}
                      </div>
                      <div className="text-xs text-foreground-muted">{r.employee.employeeCode}</div>
                    </TD>
                    <TD className="text-foreground-muted">{r.employee.department?.name ?? '—'}</TD>
                    <TD>
                      <Badge tone="info">{r.leaveType}</Badge>
                    </TD>
                    <TD>
                      {ymd(r.startDate)} – {ymd(r.endDate)}
                    </TD>
                    <TD>{r.days}</TD>
                    <TD className="max-w-xs truncate text-foreground-muted">{r.reason ?? '—'}</TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      )}
    </div>
  )
}
