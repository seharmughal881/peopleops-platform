import Link from 'next/link'
import { Card, CardHeader, Stat } from '@/lib/ui/Card'
import { Table, THead, TR, TH, TD } from '@/lib/ui/Table'
import { Badge } from '@/lib/ui/Badge'
import { Avatar } from '@/lib/ui/Avatar'
import { ArrowLeftIcon } from '@/lib/ui/icons'
import {
  attendanceRosterRange,
  summarizeRosterByEmployee,
  type DailyAttendanceRow,
  type EmployeeAttendanceSummary,
} from '@/lib/modules/reporting'
import { PeriodToggle, resolvePeriod, type PeriodKey } from '../_components/PeriodToggle'
import { RosterDatePicker } from '../_components/RosterDatePicker'
import { RosterFilterBar } from '../_components/RosterFilterBar'
import { resolveStatusFilter, type StatusFilter } from '../_components/roster-status'
import { formatMinutes } from '@/lib/ui/format'

const LATE_HOUR = 9
const LATE_MINUTE = 30
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function toYmd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseDateParam(raw: string | undefined): Date {
  if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const d = new Date(`${raw}T00:00:00`)
    if (!isNaN(d.getTime())) return d
  }
  return new Date()
}

function rangeFor(period: PeriodKey, ref: Date): { start: Date; end: Date; label: string } {
  if (period === 'day') {
    const start = new Date(ref)
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)
    return {
      start,
      end,
      label: start.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    }
  }
  if (period === 'week') {
    const start = new Date(ref)
    start.setHours(0, 0, 0, 0)
    const dow = start.getDay()
    const offset = dow === 0 ? -6 : 1 - dow
    start.setDate(start.getDate() + offset)
    const end = new Date(start)
    end.setDate(end.getDate() + 7)
    const lastDay = new Date(end)
    lastDay.setDate(lastDay.getDate() - 1)
    return {
      start,
      end,
      label: `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${lastDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
    }
  }
  const start = new Date(ref.getFullYear(), ref.getMonth(), 1)
  const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 1)
  return {
    start,
    end,
    label: start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
  }
}

function formatTime(d: Date | null): string {
  if (!d) return '—'
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function formatBreaks(regular: number, namaz: number): string {
  if (regular === 0 && namaz === 0) return '—'
  const parts: string[] = []
  if (regular > 0) parts.push(formatMinutes(regular))
  if (namaz > 0) parts.push(`${formatMinutes(namaz)} namaz`)
  return parts.join(' · ')
}

function minutesLate(d: Date): number {
  return Math.max(0, (d.getHours() - LATE_HOUR) * 60 + (d.getMinutes() - LATE_MINUTE))
}

function avgCheckInLabel(rows: DailyAttendanceRow[]): string {
  if (rows.length === 0) return '—'
  const totalMinutes = rows.reduce((s, r) => s + r.clockIn.getHours() * 60 + r.clockIn.getMinutes(), 0)
  const avg = Math.round(totalMinutes / rows.length)
  const h = Math.floor(avg / 60)
  const m = avg % 60
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

function applyFilters(
  rows: DailyAttendanceRow[],
  filters: { q: string; status: StatusFilter; dept: string; employeeId: string },
): DailyAttendanceRow[] {
  const q = filters.q.trim().toLowerCase()
  return rows.filter((r) => {
    if (filters.employeeId && r.employeeId !== filters.employeeId) return false
    if (q) {
      const hay = `${r.name} ${r.employeeCode} ${r.department ?? ''}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    if (filters.dept && r.department !== filters.dept) return false
    const s = filters.status
    if (s !== 'all') {
      if (s === 'late' && !r.isLate) return false
      if (s === 'on-time' && r.isLate) return false
      if (s === 'working' && r.clockOut) return false
      if (s === 'done' && (!r.clockOut || r.status === 'overtime' || r.status === 'missed')) return false
      if (s === 'overtime' && r.status !== 'overtime' && r.overtimeHours <= 0) return false
      if (s === 'missed' && r.status !== 'missed') return false
    }
    return true
  })
}

function groupByDay(rows: DailyAttendanceRow[]): Map<string, DailyAttendanceRow[]> {
  const out = new Map<string, DailyAttendanceRow[]>()
  for (const r of rows) {
    const k = toYmd(r.clockIn)
    const list = out.get(k) ?? []
    list.push(r)
    out.set(k, list)
  }
  return out
}

export default async function AttendanceRosterPage({
  searchParams,
}: {
  searchParams: Promise<{
    date?: string
    period?: string
    q?: string
    status?: string
    dept?: string
    employeeId?: string
  }>
}) {
  const sp = await searchParams
  const period = resolvePeriod(sp.period)
  const ref = parseDateParam(sp.date)
  const dateStr = toYmd(ref)
  const { start, end, label } = rangeFor(period, ref)

  const q = sp.q ?? ''
  const status = resolveStatusFilter(sp.status)
  const dept = sp.dept ?? ''
  const employeeId = sp.employeeId ?? ''

  const allRows = await attendanceRosterRange(start, end)
  const departments = [...new Set(allRows.map((r) => r.department).filter((d): d is string => !!d))].sort()
  const rows = applyFilters(allRows, { q, status, dept, employeeId })

  const focusedEmployee =
    employeeId ? allRows.find((r) => r.employeeId === employeeId) ?? null : null

  const totalCheckIns = rows.length
  const lateCount = rows.filter((r) => r.isLate).length
  const overtimeHours = Math.round(rows.reduce((s, r) => s + r.overtimeHours, 0) * 10) / 10
  const missedCount = rows.filter((r) => r.status === 'missed').length

  const exportQs = new URLSearchParams({ date: dateStr, period })
  if (q) exportQs.set('q', q)
  if (status !== 'all') exportQs.set('status', status)
  if (dept) exportQs.set('dept', dept)
  if (employeeId) exportQs.set('employeeId', employeeId)

  return (
    <div className="space-y-6">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1 text-sm text-foreground-muted hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        Back to dashboard
      </Link>

      <header className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Attendance roster</h1>
          <p className="text-sm text-foreground-muted">{label}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PeriodToggle basePath="/admin/reports/roster" current={period} date={dateStr} />
          <RosterDatePicker current={dateStr} max={toYmd(new Date())} />
          <a
            href={`/admin/reports/roster/export.csv?${exportQs.toString()}`}
            className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-foreground-muted hover:bg-surface-muted hover:text-foreground"
          >
            Export CSV
          </a>
        </div>
      </header>

      <Card padding="sm">
        <RosterFilterBar q={q} status={status} department={dept} departments={departments} />
        <ActiveFilterChips
          q={q}
          status={status}
          department={dept}
          employeeName={focusedEmployee?.name}
          baseParams={{ date: dateStr, period }}
        />
      </Card>

      {focusedEmployee && (
        <EmployeeFocusCard
          rows={rows}
          name={focusedEmployee.name}
          code={focusedEmployee.employeeCode}
          department={focusedEmployee.department}
        />
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5">
        <Stat label="Check-ins" value={totalCheckIns} hint={period} />
        <Stat
          label="Avg check-in"
          value={avgCheckInLabel(rows)}
          hint={rows.length > 0 ? 'mean clock-in time' : undefined}
        />
        <Stat label="Late arrivals" value={lateCount} hint="after 9:30 AM" />
        <Stat label="Overtime" value={`${overtimeHours}h`} hint="total" />
        <Stat label="Missed" value={missedCount} hint="absences" />
      </div>

      {period === 'day' && <DayView rows={rows} dateStr={dateStr} period={period} />}
      {period === 'week' && (
        <WeekView rows={rows} start={start} dateStr={dateStr} period={period} />
      )}
      {period === 'month' && (
        <MonthView
          rows={rows}
          summary={summarizeRosterByEmployee(rows)}
          dateStr={dateStr}
          period={period}
        />
      )}
    </div>
  )
}

function ActiveFilterChips({
  q,
  status,
  department,
  employeeName,
  baseParams,
}: {
  q: string
  status: StatusFilter
  department: string
  employeeName?: string
  baseParams: { date: string; period: string }
}) {
  const chips: Array<{ label: string; clearKey: string }> = []
  if (q) chips.push({ label: `Search: "${q}"`, clearKey: 'q' })
  if (status !== 'all') chips.push({ label: `Status: ${status}`, clearKey: 'status' })
  if (department) chips.push({ label: `Dept: ${department}`, clearKey: 'dept' })
  if (employeeName) chips.push({ label: `Employee: ${employeeName}`, clearKey: 'employeeId' })
  if (chips.length === 0) return null

  function hrefWithout(key: string): string {
    const next = new URLSearchParams(baseParams)
    if (q && key !== 'q') next.set('q', q)
    if (status !== 'all' && key !== 'status') next.set('status', status)
    if (department && key !== 'dept') next.set('dept', department)
    return `/admin/reports/roster?${next.toString()}`
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
      <span className="text-xs text-foreground-subtle">Active:</span>
      {chips.map((c) => (
        <Link
          key={c.clearKey}
          href={hrefWithout(c.clearKey)}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-muted px-2 py-0.5 text-xs text-foreground-muted hover:border-border-strong hover:text-foreground"
          aria-label={`Remove filter ${c.label}`}
        >
          {c.label}
          <span aria-hidden>×</span>
        </Link>
      ))}
    </div>
  )
}

function EmployeeFocusCard({
  rows,
  name,
  code,
  department,
}: {
  rows: DailyAttendanceRow[]
  name: string
  code: string
  department: string | null
}) {
  const days = rows.length
  const totalHours = Math.round(rows.reduce((s, r) => s + (r.netHours ?? 0), 0) * 10) / 10
  const overtimeHours = Math.round(rows.reduce((s, r) => s + r.overtimeHours, 0) * 10) / 10
  const lateDays = rows.filter((r) => r.isLate).length
  const totalLateMin = rows.reduce((s, r) => s + (r.isLate ? minutesLate(r.clockIn) : 0), 0)

  return (
    <Card className="border-l-4 border-l-[var(--accent)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar name={name} size="lg" />
          <div>
            <p className="text-base font-semibold tracking-tight">{name}</p>
            <p className="text-xs text-foreground-muted">
              {code}
              {department ? ` · ${department}` : ''}
            </p>
          </div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat label="Days present" value={days} />
        <MiniStat
          label="Late"
          value={lateDays}
          hint={lateDays > 0 ? formatMinutes(totalLateMin) : undefined}
          tone={lateDays > 0 ? 'warn' : 'neutral'}
        />
        <MiniStat label="Hours" value={`${totalHours.toFixed(1)}h`} />
        <MiniStat
          label="Overtime"
          value={`${overtimeHours.toFixed(1)}h`}
          tone={overtimeHours > 0 ? 'success' : 'neutral'}
        />
      </div>
    </Card>
  )
}

function MiniStat({
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  label: string
  value: string | number
  hint?: string
  tone?: 'neutral' | 'warn' | 'success'
}) {
  const valueColor =
    tone === 'warn' ? 'text-amber-600' : tone === 'success' ? 'text-emerald-600' : 'text-foreground'
  return (
    <div className="rounded-md border border-border bg-surface-muted/40 px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wide text-foreground-muted">{label}</p>
      <p className={`mt-0.5 text-lg font-semibold tracking-tight tabular-nums ${valueColor}`}>
        {value}
      </p>
      {hint && <p className="text-xs text-foreground-subtle">{hint}</p>}
    </div>
  )
}

function DayView({
  rows,
  dateStr,
  period,
}: {
  rows: DailyAttendanceRow[]
  dateStr: string
  period: PeriodKey
}) {
  return (
    <Card>
      <CardHeader
        title="Employee check-ins"
        subtitle="Sorted by clock-in time · click a name to drill down"
        action={
          <span className="text-xs text-foreground-muted">
            {rows.length} {rows.length === 1 ? 'employee' : 'employees'}
          </span>
        }
      />
      {rows.length === 0 ? (
        <EmptyState />
      ) : (
        <RosterTable rows={rows} dateStr={dateStr} period={period} />
      )}
    </Card>
  )
}

function WeekView({
  rows,
  start,
  dateStr,
  period,
}: {
  rows: DailyAttendanceRow[]
  start: Date
  dateStr: string
  period: PeriodKey
}) {
  const grouped = groupByDay(rows)
  const days: Array<{ date: Date; key: string }> = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    days.push({ date: d, key: toYmd(d) })
  }
  return (
    <div className="space-y-4">
      {days.map(({ date, key }) => {
        const dayRows = grouped.get(key) ?? []
        return (
          <Card key={key}>
            <CardHeader
              title={`${WEEKDAYS[date.getDay()]}, ${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`}
              subtitle={
                dayRows.length === 0
                  ? 'No check-ins'
                  : `${dayRows.length} ${dayRows.length === 1 ? 'check-in' : 'check-ins'} · ${dayRows.filter((r) => r.isLate).length} late`
              }
              action={
                <Link
                  href={`/admin/reports/roster?period=day&date=${key}`}
                  className="text-xs text-foreground-muted hover:text-foreground"
                >
                  View day →
                </Link>
              }
            />
            {dayRows.length === 0 ? (
              <p className="text-sm text-foreground-muted">No check-ins on this day.</p>
            ) : (
              <RosterTable rows={dayRows} dateStr={dateStr} period={period} />
            )}
          </Card>
        )
      })}
    </div>
  )
}

function MonthView({
  rows,
  summary,
  dateStr,
  period,
}: {
  rows: DailyAttendanceRow[]
  summary: EmployeeAttendanceSummary[]
  dateStr: string
  period: PeriodKey
}) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Monthly summary by employee"
          subtitle="Per-employee totals · click a name to see every check-in"
          action={
            <span className="text-xs text-foreground-muted">
              {summary.length} {summary.length === 1 ? 'employee' : 'employees'}
            </span>
          }
        />
        {summary.length === 0 ? (
          <EmptyState />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Employee</TH>
                <TH>Department</TH>
                <TH className="text-right">Days</TH>
                <TH className="text-right">Late</TH>
                <TH className="text-right">Hours</TH>
                <TH className="text-right">Overtime</TH>
              </TR>
            </THead>
            <tbody>
              {summary.map((s) => (
                <TR key={s.employeeId}>
                  <TD>
                    <EmployeeCell
                      name={s.name}
                      code={s.employeeCode}
                      employeeId={s.employeeId}
                      dateStr={dateStr}
                      period={period}
                    />
                  </TD>
                  <TD className="text-foreground-muted">{s.department ?? '—'}</TD>
                  <TD className="text-right tabular-nums">{s.daysPresent}</TD>
                  <TD className="text-right tabular-nums">
                    {s.lateDays > 0 ? (
                      <span className="text-amber-600">
                        {s.lateDays}{' '}
                        <span className="text-xs text-foreground-muted">
                          ({formatMinutes(s.totalMinutesLate)})
                        </span>
                      </span>
                    ) : (
                      '—'
                    )}
                  </TD>
                  <TD className="text-right tabular-nums">{s.totalHours.toFixed(1)}h</TD>
                  <TD className="text-right tabular-nums">
                    {s.overtimeHours > 0 ? (
                      <span className="text-emerald-600">+{s.overtimeHours.toFixed(1)}h</span>
                    ) : (
                      '—'
                    )}
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Card>
        <CardHeader
          title="All check-ins this month"
          subtitle="Every clock-in chronologically"
          action={
            <span className="text-xs text-foreground-muted">
              {rows.length} {rows.length === 1 ? 'record' : 'records'}
            </span>
          }
        />
        {rows.length === 0 ? (
          <EmptyState />
        ) : (
          <RosterTable rows={rows} showDate dateStr={dateStr} period={period} />
        )}
      </Card>
    </div>
  )
}

function EmployeeCell({
  name,
  code,
  employeeId,
  dateStr,
  period,
}: {
  name: string
  code: string
  employeeId: string
  dateStr: string
  period: PeriodKey
}) {
  const href = `/admin/reports/roster?period=${period}&date=${dateStr}&employeeId=${employeeId}`
  return (
    <Link href={href} className="group flex items-center gap-2.5">
      <Avatar name={name} size="sm" />
      <span className="min-w-0">
        <span className="block font-medium text-foreground group-hover:text-[var(--accent)]">
          {name}
        </span>
        <span className="block text-xs text-foreground-muted">{code}</span>
      </span>
    </Link>
  )
}

function RosterTable({
  rows,
  showDate = false,
  dateStr,
  period,
}: {
  rows: DailyAttendanceRow[]
  showDate?: boolean
  dateStr: string
  period: PeriodKey
}) {
  return (
    <Table>
      <THead>
        <TR>
          <TH>Employee</TH>
          <TH>Department</TH>
          {showDate && <TH>Date</TH>}
          <TH>Check-in</TH>
          <TH>Check-out</TH>
          <TH>Breaks</TH>
          <TH className="text-right">Hours</TH>
          <TH>Status</TH>
        </TR>
      </THead>
      <tbody>
        {rows.map((r) => {
          const stillIn = !r.clockOut
          const lateBy = r.isLate ? minutesLate(r.clockIn) : 0
          return (
            <TR key={`${r.employeeId}-${r.clockIn.toISOString()}`}>
              <TD>
                <EmployeeCell
                  name={r.name}
                  code={r.employeeCode}
                  employeeId={r.employeeId}
                  dateStr={dateStr}
                  period={period}
                />
              </TD>
              <TD className="text-foreground-muted">{r.department ?? '—'}</TD>
              {showDate && (
                <TD className="text-foreground-muted tabular-nums">
                  {r.clockIn.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </TD>
              )}
              <TD>
                <span
                  className={
                    r.isLate ? 'tabular-nums font-medium text-amber-600' : 'tabular-nums'
                  }
                >
                  {formatTime(r.clockIn)}
                </span>
                {r.isLate && (
                  <span className="ml-2 text-xs text-amber-600">
                    +{formatMinutes(lateBy)} late
                  </span>
                )}
              </TD>
              <TD className="tabular-nums">{formatTime(r.clockOut)}</TD>
              <TD className="text-xs text-foreground-muted">
                {formatBreaks(r.regularBreakMinutes, r.namazBreakMinutes)}
                {r.openBreak && <span className="ml-2 text-sky-600">on break</span>}
              </TD>
              <TD className="text-right tabular-nums">
                {r.netHours != null ? `${r.netHours.toFixed(1)}h` : '—'}
                {r.overtimeHours > 0 && (
                  <span className="ml-2 text-xs text-emerald-600">
                    +{r.overtimeHours.toFixed(1)}h
                  </span>
                )}
              </TD>
              <TD>
                {stillIn ? (
                  <Badge tone="success" dot>
                    Working
                  </Badge>
                ) : r.status === 'overtime' ? (
                  <Badge tone="info">Overtime</Badge>
                ) : r.status === 'missed' ? (
                  <Badge tone="danger">Missed</Badge>
                ) : (
                  <Badge tone="neutral">Done</Badge>
                )}
              </TD>
            </TR>
          )
        })}
      </tbody>
    </Table>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <div className="rounded-full bg-surface-muted p-3 text-foreground-subtle">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-6"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      </div>
      <p className="text-sm font-medium text-foreground">No matching records</p>
      <p className="text-xs text-foreground-muted">
        Try a different date or clear the filters above.
      </p>
    </div>
  )
}
