import { orgTimesheetSummary } from '@/lib/modules/attendance/timesheet'
import { Card, CardHeader, Stat } from '@/lib/ui/Card'
import { Table, THead, TR, TH, TD, Badge } from '@/lib/ui/Table'

export default async function AdminTimesheetsPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>
}) {
  const sp = await searchParams
  const week = sp.week ? new Date(sp.week) : undefined
  const team = await orgTimesheetSummary(week)

  const weekStart = team[0]?.sheet.weekStart ?? '—'
  const weekEnd = team[0]?.sheet.weekEnd ?? '—'

  const totalHours = team.reduce((s, t) => s + t.sheet.totalHours, 0)
  const totalOvertime = team.reduce((s, t) => s + t.sheet.totalOvertimeHours, 0)
  const overtimeCount = team.filter((t) => t.sheet.totalOvertimeHours > 0).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Timesheets</h1>
        <p className="text-sm text-foreground-muted">
          Week of {weekStart} → {weekEnd}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Employees" value={team.length} />
        <Stat label="Total hours" value={`${totalHours.toFixed(1)}h`} />
        <Stat
          label="Overtime"
          value={`${totalOvertime.toFixed(1)}h`}
          hint={`${overtimeCount} employee${overtimeCount === 1 ? '' : 's'} with OT`}
        />
      </div>

      <Card>
        <CardHeader title="All employees" subtitle={`${team.length} active`} />
        <Table>
          <THead>
            <TR>
              <TH>Employee</TH>
              <TH>Department</TH>
              <TH>Total hours</TH>
              <TH>Overtime</TH>
              <TH>Days worked</TH>
              <TH>Status</TH>
            </TR>
          </THead>
          <tbody>
            {team.length === 0 && <TR><TD>No active employees.</TD></TR>}
            {team.map(({ employee, sheet }) => {
              const workingDays = sheet.days.filter((d) => d.hours > 0).length
              const tone =
                sheet.totalOvertimeHours > 0 ? 'warn' : workingDays === 0 ? 'neutral' : 'success'
              const label =
                tone === 'warn' ? 'overtime' : tone === 'success' ? 'on track' : 'no logs'
              return (
                <TR key={employee.id}>
                  <TD>
                    <div className="font-medium">
                      {employee.firstName} {employee.lastName}
                    </div>
                    <div className="text-xs text-foreground-muted">{employee.employeeCode}</div>
                  </TD>
                  <TD className="text-foreground-muted">{employee.department?.name ?? '—'}</TD>
                  <TD>{sheet.totalHours}h</TD>
                  <TD>{sheet.totalOvertimeHours > 0 ? `${sheet.totalOvertimeHours}h` : '—'}</TD>
                  <TD>{workingDays}</TD>
                  <TD><Badge tone={tone}>{label}</Badge></TD>
                </TR>
              )
            })}
          </tbody>
        </Table>
      </Card>
    </div>
  )
}
