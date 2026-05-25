import { requireUser } from '@/lib/modules/auth'
import { weeklyTimesheet } from '@/lib/modules/attendance/timesheet'
import { Card, CardHeader, Stat } from '@/lib/ui/Card'
import { Table, THead, TR, TH, TD } from '@/lib/ui/Table'
import { PageHeader } from '@/lib/ui/PageHeader'

function parseWeekParam(s?: string): Date | undefined {
  if (!s) return undefined
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? undefined : d
}

export default async function TimesheetPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const sp = await searchParams
  const user = await requireUser()
  if (!user.employee) {
    return <Card><p>No employee record linked.</p></Card>
  }
  const sheet = await weeklyTimesheet(user.employee.id, parseWeekParam(sp.week))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Timesheet"
        description={`Week of ${sheet.weekStart} → ${sheet.weekEnd}`}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Stat label="Total hours" value={`${sheet.totalHours}h`} />
        <Stat label="Overtime" value={`${sheet.totalOvertimeHours}h`} hint="incl. self-reported" />
        <Stat label="Self-reported" value={`${sheet.totalSelfReportedHours}h`} hint="approved entries" />
        <Stat label="Working days" value={sheet.days.filter((d) => d.hours > 0).length} />
      </div>

      <Card>
        <CardHeader title="Daily breakdown" />
        <Table>
          <THead>
            <TR>
              <TH>Date</TH>
              <TH>Clocked</TH>
              <TH>Self-reported</TH>
              <TH>Overtime</TH>
              <TH>Logs</TH>
            </TR>
          </THead>
          <tbody>
            {sheet.days.map((d) => {
              const clocked = Number((d.hours - d.selfReportedHours).toFixed(2))
              return (
                <TR key={d.date}>
                  <TD>{d.date}</TD>
                  <TD>{clocked > 0 ? `${clocked}h` : '—'}</TD>
                  <TD>{d.selfReportedHours > 0 ? `${d.selfReportedHours}h` : '—'}</TD>
                  <TD>{d.overtimeHours > 0 ? `${d.overtimeHours}h` : '—'}</TD>
                  <TD>{d.logs || '—'}</TD>
                </TR>
              )
            })}
          </tbody>
        </Table>
      </Card>
    </div>
  )
}
