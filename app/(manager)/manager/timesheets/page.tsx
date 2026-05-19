import { requireUser } from '@/lib/modules/auth'
import { teamTimesheetSummary } from '@/lib/modules/attendance/timesheet'
import { Card, CardHeader } from '@/lib/ui/Card'
import { Table, THead, TR, TH, TD, Badge } from '@/lib/ui/Table'
import { PageHeader } from '@/lib/ui/PageHeader'

export default async function ManagerTimesheetsPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const sp = await searchParams
  const user = await requireUser()
  if (!user.employee) return <Card><p>No employee record.</p></Card>

  const week = sp.week ? new Date(sp.week) : undefined
  const team = await teamTimesheetSummary(user.employee.id, week)

  const weekStart = team[0]?.sheet.weekStart ?? '—'
  const weekEnd = team[0]?.sheet.weekEnd ?? '—'

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team timesheets"
        description={`Week of ${weekStart} → ${weekEnd}`}
      />

      <Card>
        <CardHeader title="Direct reports" subtitle={`${team.length} member(s)`} />
        <Table>
          <THead>
            <TR><TH>Employee</TH><TH>Total hours</TH><TH>Overtime</TH><TH>Days worked</TH><TH></TH></TR>
          </THead>
          <tbody>
            {team.length === 0 && <TR><TD>No direct reports.</TD></TR>}
            {team.map(({ employee, sheet }) => {
              const workingDays = sheet.days.filter((d) => d.hours > 0).length
              const tone = sheet.totalOvertimeHours > 0 ? 'warn' : workingDays === 0 ? 'neutral' : 'success'
              return (
                <TR key={employee.id}>
                  <TD className="font-medium">
                    {employee.firstName} {employee.lastName}
                    <span className="ml-1 text-xs text-foreground-muted">({employee.employeeCode})</span>
                  </TD>
                  <TD>{sheet.totalHours}h</TD>
                  <TD>{sheet.totalOvertimeHours > 0 ? `${sheet.totalOvertimeHours}h` : '—'}</TD>
                  <TD>{workingDays}</TD>
                  <TD><Badge tone={tone}>{tone === 'warn' ? 'overtime' : tone === 'success' ? 'on track' : 'no logs'}</Badge></TD>
                </TR>
              )
            })}
          </tbody>
        </Table>
      </Card>
    </div>
  )
}
