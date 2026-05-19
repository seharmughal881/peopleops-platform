import Link from 'next/link'
import { Card, CardHeader, Stat } from '@/lib/ui/Card'
import { LineChart, HBarChart } from '@/lib/ui/Chart'
import { Table, THead, TR, TH, TD } from '@/lib/ui/Table'
import {
  attendanceInsights,
  attendanceDailyTrend,
  topLateComers,
  topAbsentees,
} from '@/lib/modules/reporting'
import { ArrowLeftIcon } from '@/lib/ui/icons'
import { RangeToggle, type RangeKey } from '../_components/RangeToggle'

function daysForRange(key: RangeKey): number {
  if (key === '30d') return 30
  if (key === '90d') return 90
  if (key === '1y') return 365
  // YTD
  const now = new Date()
  return Math.max(1, Math.ceil((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000))
}

function resolveRange(raw: string | undefined): { days: number; key: RangeKey; label: string } {
  const key: RangeKey = raw === '30d' || raw === '90d' || raw === '1y' || raw === 'ytd' ? raw : '30d'
  const label =
    key === '30d' ? 'Last 30 days'
      : key === '90d' ? 'Last 90 days'
      : key === '1y' ? 'Last 12 months'
      : 'YTD'
  return { days: daysForRange(key), key, label }
}

export default async function AttendanceReportPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}) {
  const { range: rangeRaw } = await searchParams
  const { days, key, label } = resolveRange(rangeRaw)

  // Trend always shows last 30 days for visual readability regardless of window.
  const trendDays = Math.min(days, 30)
  const [insights, trend, late, absentees] = await Promise.all([
    attendanceInsights(days),
    attendanceDailyTrend(trendDays),
    topLateComers(days, 10),
    topAbsentees(days, 10),
  ])

  return (
    <div className="space-y-6">
      <BackToReports />

      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Attendance insights</h1>
          <p className="text-sm text-foreground-muted">Lateness, absenteeism, overtime, and offenders.</p>
        </div>
        <RangeToggle basePath="/admin/reports/attendance" current={key} />
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Clock-ins" value={insights.totalLogs} hint={label} />
        <Stat label="Avg daily hours" value={insights.avgDailyHours} hint={`${insights.daysCovered} days w/ data`} />
        <Stat label="Late arrivals" value={insights.lateCount} hint="after 9:30am" />
        <Stat label="Absences" value={insights.missedCount} hint="missed status" />
        <Stat label="Overtime" value={insights.overtimeCount} hint="logs" />
      </div>

      <Card>
        <CardHeader title="Daily on-time vs late vs missed" subtitle={`Last ${trendDays} days`} />
        <div className="space-y-3">
          <LineChart points={trend.map((d) => ({ label: d.label, value: d.onTime }))} tone="success" height={120} emptyLabel="No data" />
          <LineChart points={trend.map((d) => ({ label: d.label, value: d.late }))} tone="warn" height={100} emptyLabel="No late arrivals" />
          <LineChart points={trend.map((d) => ({ label: d.label, value: d.missed }))} tone="danger" height={100} emptyLabel="No absences" />
        </div>
        <p className="mt-2 text-xs text-foreground-subtle">
          On-time (green) · Late (amber) · Missed (red)
        </p>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Top late arrivals" subtitle={label} />
          {late.length === 0 ? (
            <p className="text-sm text-foreground-muted">No late arrivals.</p>
          ) : (
            <Table>
              <THead>
                <TR><TH>Employee</TH><TH>Code</TH><TH>Late days</TH></TR>
              </THead>
              <tbody>
                {late.map((e) => (
                  <TR key={e.code}>
                    <TD className="font-medium">{e.name}</TD>
                    <TD className="text-foreground-muted">{e.code}</TD>
                    <TD className="tabular-nums">{e.count}</TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
        <Card>
          <CardHeader title="Top absentees" subtitle={label} />
          {absentees.length === 0 ? (
            <p className="text-sm text-foreground-muted">No absences recorded.</p>
          ) : (
            <HBarChart data={absentees.map((e) => ({ label: e.name, value: e.count }))} tone="danger" />
          )}
        </Card>
      </div>
    </div>
  )
}

function BackToReports() {
  return (
    <Link href="/admin/reports" className="inline-flex items-center gap-1 text-sm text-foreground-muted hover:text-foreground">
      <ArrowLeftIcon className="size-4" />
      Back to reports
    </Link>
  )
}
