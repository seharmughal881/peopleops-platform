import { Card, CardHeader, Stat } from '@/lib/ui/Card'
import { headcountByDepartment, attendanceInsights, leaveSummary, attritionThisYear } from '@/lib/modules/reporting'
import { documentsExpiringSoon } from '@/lib/modules/compliance'

export default async function AdminHome() {
  const [headcount, attendance, leave, attrition, expiring] = await Promise.all([
    headcountByDepartment(),
    attendanceInsights(30),
    leaveSummary(),
    attritionThisYear(),
    documentsExpiringSoon(60),
  ])

  const totalEmployees = headcount.reduce((s, h) => s + h.count, 0)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Admin overview</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Active employees" value={totalEmployees} />
        <Stat label="Attendance logs (30d)" value={attendance.totalLogs} hint={`${attendance.overtimeCount} overtime`} />
        <Stat label="Pending leave" value={leave.pending} hint={`${leave.approved} approved YTD`} />
        <Stat label="Attrition YTD" value={`${attrition.rate}%`} hint={`${attrition.separations} separations`} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Headcount by department" />
          <ul className="space-y-2 text-sm">
            {headcount.map((h) => (
              <li key={h.department} className="flex justify-between">
                <span>{h.department}</span>
                <span className="font-semibold">{h.count}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Documents expiring soon" subtitle="Next 60 days" />
          {expiring.length === 0 && <p className="text-sm text-foreground-muted">No upcoming document expirations.</p>}
          <ul className="space-y-2 text-sm">
            {expiring.map((d) => (
              <li key={d.id} className="flex justify-between">
                <span>{d.employee.firstName} {d.employee.lastName} — {d.type}</span>
                <span className="text-amber-600">{d.expiresAt && new Date(d.expiresAt).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}
