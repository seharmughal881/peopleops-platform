import Link from 'next/link'
import { Card, CardHeader, Stat } from '@/lib/ui/Card'
import { HBarChart, LineChart } from '@/lib/ui/Chart'
import { Badge } from '@/lib/ui/Badge'
import { Table, THead, TR, TH, TD } from '@/lib/ui/Table'
import {
  attendanceInsights,
  attritionMonthlyTrend,
  attritionThisYear,
  dailyAttendanceRoster,
  headcountByDepartment,
  headcountTrend,
  leaveSummary,
  monthlyAttendanceInsights,
  monthlyLeaveSummary,
} from '@/lib/modules/reporting'
import { documentsExpiringSoon } from '@/lib/modules/compliance'

function formatTime(d: Date | null): string {
  if (!d) return '—'
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function formatBreakMinutes(regular: number, namaz: number): string {
  if (regular === 0 && namaz === 0) return '—'
  const parts: string[] = []
  if (regular > 0) parts.push(`${regular}m break`)
  if (namaz > 0) parts.push(`${namaz}m namaz`)
  return parts.join(' · ')
}

export default async function AdminHome() {
  const today = new Date()
  const [
    headcount,
    trend,
    attrition,
    attritionTrend,
    attendance,
    leave,
    expiring,
    roster,
    monthlyAttendance,
    monthlyLeave,
  ] = await Promise.all([
    headcountByDepartment(),
    headcountTrend(12),
    attritionThisYear(),
    attritionMonthlyTrend(12),
    attendanceInsights(30),
    leaveSummary(),
    documentsExpiringSoon(60),
    dailyAttendanceRoster(today),
    monthlyAttendanceInsights(today),
    monthlyLeaveSummary(today),
  ])

  const totalEmployees = headcount.reduce((s, h) => s + h.count, 0)
  const firstHc = trend[0]?.headcount ?? 0
  const lastHc = trend.at(-1)?.headcount ?? 0
  const yoyDelta = lastHc - firstHc
  const yoyPct = firstHc > 0 ? Math.round((yoyDelta / firstHc) * 1000) / 10 : 0
  const netFlowLast = (trend.at(-1)?.hires ?? 0) - (trend.at(-1)?.exits ?? 0)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Admin overview</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Active employees"
          value={totalEmployees}
          hint={yoyDelta === 0 ? '—' : `${yoyDelta > 0 ? '+' : ''}${yoyDelta} YoY (${yoyPct}%)`}
        />
        <Stat
          label="Attendance logs (30d)"
          value={attendance.totalLogs}
          hint={`${attendance.overtimeCount} overtime`}
        />
        <Stat
          label="Pending leave"
          value={leave.pending}
          hint={`${leave.approved} approved YTD`}
        />
        <Stat
          label="Attrition YTD"
          value={`${attrition.rate}%`}
          hint={`${attrition.separations} separations`}
        />
      </div>

      <Card>
        <CardHeader
          title={`This month · ${monthlyAttendance.monthLabel}`}
          subtitle="Leave, late check-ins, and overtime so far this calendar month"
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/admin/reports/this-month?view=leave"
            className="block rounded-lg transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <Stat
              label="Approved leave"
              value={monthlyLeave.approved}
              hint={`${monthlyLeave.approvedDays} days · ${monthlyLeave.pending} pending`}
            />
          </Link>
          <Link
            href="/admin/reports/this-month?view=late"
            className="block rounded-lg transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <Stat
              label="Late check-ins"
              value={monthlyAttendance.lateCount}
              hint={`${monthlyAttendance.totalLogs} total check-ins`}
            />
          </Link>
          <Link
            href="/admin/reports/this-month?view=overtime"
            className="block rounded-lg transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <Stat
              label="Extra (overtime) hours"
              value={`${monthlyAttendance.overtimeHours}h`}
              hint={`${monthlyAttendance.missedCount} missed days`}
            />
          </Link>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Today's attendance"
          subtitle={today.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
          action={
            <div className="flex items-center gap-3 text-xs">
              <span className="text-foreground-muted">
                {roster.length} {roster.length === 1 ? 'employee' : 'employees'} checked in
              </span>
              <Link
                href="/admin/reports/roster?period=day"
                className="font-medium text-foreground-muted hover:text-foreground"
              >
                View any date →
              </Link>
            </div>
          }
        />
        {roster.length === 0 ? (
          <p className="text-sm text-foreground-muted">No one has clocked in yet today.</p>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Employee</TH>
                <TH>Department</TH>
                <TH>Check-in</TH>
                <TH>Check-out</TH>
                <TH>Breaks</TH>
                <TH>Hours</TH>
                <TH>Status</TH>
              </TR>
            </THead>
            <tbody>
              {roster.map((r) => {
                const stillIn = !r.clockOut
                return (
                  <TR key={r.employeeId + r.clockIn.toISOString()}>
                    <TD>
                      <div className="font-medium">{r.name}</div>
                      <div className="text-xs text-foreground-muted">{r.employeeCode}</div>
                    </TD>
                    <TD className="text-foreground-muted">{r.department ?? '—'}</TD>
                    <TD>
                      <span className={r.isLate ? 'text-amber-600' : ''}>
                        {formatTime(r.clockIn)}
                      </span>
                      {r.isLate && (
                        <span className="ml-2 text-xs text-amber-600">late</span>
                      )}
                    </TD>
                    <TD>{formatTime(r.clockOut)}</TD>
                    <TD className="text-foreground-muted">
                      {formatBreakMinutes(r.regularBreakMinutes, r.namazBreakMinutes)}
                      {r.openBreak && (
                        <span className="ml-2 text-xs text-sky-600">on break</span>
                      )}
                    </TD>
                    <TD>
                      {r.netHours != null ? `${r.netHours.toFixed(1)}h` : '—'}
                      {r.overtimeHours > 0 && (
                        <span className="ml-2 text-xs text-emerald-600">
                          +{r.overtimeHours.toFixed(1)}h OT
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
        )}
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Headcount trend"
            subtitle={`Last 12 months · net last month: ${netFlowLast >= 0 ? '+' : ''}${netFlowLast}`}
          />
          <LineChart
            points={trend.map((t) => ({ label: t.label, value: t.headcount }))}
            tone="accent"
            yLabel="Headcount"
            height={200}
          />
        </Card>

        <Card>
          <CardHeader title="Monthly separations" subtitle="Last 12 months" />
          <LineChart points={attritionTrend} tone="danger" yLabel="Separations" height={200} />
        </Card>

        <Card>
          <CardHeader title="Headcount by department" />
          <HBarChart
            data={headcount.map((h) => ({ label: h.department, value: h.count }))}
            tone="accent"
            emptyLabel="No active employees."
          />
        </Card>

        <Card>
          <CardHeader title="Documents expiring soon" subtitle="Next 60 days" />
          {expiring.length === 0 && (
            <p className="text-sm text-foreground-muted">No upcoming document expirations.</p>
          )}
          <ul className="space-y-2 text-sm">
            {expiring.map((d) => (
              <li key={d.id} className="flex justify-between">
                <span>
                  {d.employee.firstName} {d.employee.lastName} — {d.type}
                </span>
                <span className="text-amber-600">
                  {d.expiresAt && new Date(d.expiresAt).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}
