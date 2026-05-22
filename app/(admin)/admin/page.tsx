import { Card, CardHeader, Stat } from '@/lib/ui/Card'
import { HBarChart, LineChart } from '@/lib/ui/Chart'
import {
  attendanceInsights,
  attritionMonthlyTrend,
  attritionThisYear,
  headcountByDepartment,
  headcountTrend,
  leaveSummary,
} from '@/lib/modules/reporting'
import { documentsExpiringSoon } from '@/lib/modules/compliance'

export default async function AdminHome() {
  const [headcount, trend, attrition, attritionTrend, attendance, leave, expiring] =
    await Promise.all([
      headcountByDepartment(),
      headcountTrend(12),
      attritionThisYear(),
      attritionMonthlyTrend(12),
      attendanceInsights(30),
      leaveSummary(),
      documentsExpiringSoon(60),
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
