import { requireUser } from '@/lib/modules/auth'
import { getOpenLog, listMyAttendance } from '@/lib/modules/attendance'
import { Card, CardHeader } from '@/lib/ui/Card'
import { Table, THead, TR, TH, TD, Badge } from '@/lib/ui/Table'
import { ClockButtons } from './ClockButtons'

function breakMinutes(breaks: { startedAt: Date; endedAt: Date | null }[], fallbackEnd: Date | null): number {
  const ms = breaks.reduce((sum, b) => {
    const end = b.endedAt ?? fallbackEnd
    if (!end) return sum
    return sum + (end.getTime() - b.startedAt.getTime())
  }, 0)
  return Math.round(ms / 60000)
}

export default async function AttendancePage() {
  const user = await requireUser()
  if (!user.employee) return <Card>No employee record.</Card>

  const [open, logs] = await Promise.all([
    getOpenLog(user.employee.id),
    listMyAttendance(user.employee.id, { days: 30 }),
  ])

  const activeBreak = open?.breaks.find((b) => !b.endedAt) ?? null

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Clock in / out"
          subtitle={
            open
              ? activeBreak
                ? `On break since ${new Date(activeBreak.startedAt).toLocaleTimeString()}`
                : `Clocked in at ${new Date(open.clockIn).toLocaleString()}`
              : 'Not clocked in'
          }
        />
        <ClockButtons
          isClockedIn={!!open}
          activeBreakStartedAt={activeBreak ? new Date(activeBreak.startedAt).toISOString() : null}
        />
      </Card>

      <Card>
        <CardHeader title="Recent attendance" subtitle="Last 30 days" />
        <Table>
          <THead>
            <TR>
              <TH>Date</TH>
              <TH>In</TH>
              <TH>Out</TH>
              <TH>Hours</TH>
              <TH>Break</TH>
              <TH>Status</TH>
              <TH>Source</TH>
            </TR>
          </THead>
          <tbody>
            {logs.length === 0 && (
              <TR><TD>No attendance logs yet.</TD><TD></TD><TD></TD><TD></TD><TD></TD><TD></TD><TD></TD></TR>
            )}
            {logs.map((l) => {
              const inDate = new Date(l.clockIn)
              const outDate = l.clockOut ? new Date(l.clockOut) : null
              const breakMin = breakMinutes(l.breaks, outDate)
              const netHours = outDate
                ? (((outDate.getTime() - inDate.getTime()) - breakMin * 60000) / 3600000).toFixed(2)
                : '—'
              return (
                <TR key={l.id}>
                  <TD>{inDate.toLocaleDateString()}</TD>
                  <TD>{inDate.toLocaleTimeString()}</TD>
                  <TD>{outDate ? outDate.toLocaleTimeString() : '—'}</TD>
                  <TD>{netHours}</TD>
                  <TD>{breakMin > 0 ? `${breakMin}m` : '—'}</TD>
                  <TD><Badge tone={l.status === 'overtime' ? 'warn' : 'neutral'}>{l.status}</Badge></TD>
                  <TD>{l.source}</TD>
                </TR>
              )
            })}
          </tbody>
        </Table>
      </Card>
    </div>
  )
}
