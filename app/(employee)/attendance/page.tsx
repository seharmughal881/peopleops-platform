import { requireUser } from '@/lib/modules/auth'
import { getOpenLog, listMyAttendance } from '@/lib/modules/attendance'
import { myOvertimeEntries } from '@/lib/modules/overtime-entries'
import { Card, CardHeader } from '@/lib/ui/Card'
import { Table, THead, TR, TH, TD, Badge } from '@/lib/ui/Table'
import { formatMinutes } from '@/lib/ui/format'
import { ClockButtons } from './ClockButtons'
import { ExtraHoursForm, CancelEntryButton } from './ExtraHoursForm'

// Only regular breaks deduct from working time. Namaz breaks are exempt
// (employee gets relief), so they're tracked separately for display only.
function breakMinutes(
  breaks: { startedAt: Date; endedAt: Date | null; type: string }[],
  fallbackEnd: Date | null,
  filter: 'regular' | 'namaz' | 'all' = 'regular',
): number {
  const ms = breaks.reduce((sum, b) => {
    if (filter !== 'all' && b.type !== filter) return sum
    const end = b.endedAt ?? fallbackEnd
    if (!end) return sum
    return sum + (end.getTime() - b.startedAt.getTime())
  }, 0)
  return Math.round(ms / 60000)
}

export default async function AttendancePage() {
  const user = await requireUser()
  if (!user.employee) return <Card>No employee record.</Card>

  const [open, logs, overtimeEntries] = await Promise.all([
    getOpenLog(user.employee.id),
    listMyAttendance(user.employee.id, { days: 30 }),
    myOvertimeEntries(user.employee.id, { days: 60 }),
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
          activeBreakType={activeBreak ? (activeBreak.type === 'namaz' ? 'namaz' : 'regular') : null}
        />
      </Card>

      {open && open.breaks.length > 0 && (
        <Card>
          <CardHeader title="Today's breaks" subtitle={`${open.breaks.length} break${open.breaks.length === 1 ? '' : 's'} this session`} />
          <Table>
            <THead>
              <TR>
                <TH>#</TH>
                <TH>Type</TH>
                <TH>Started</TH>
                <TH>Ended</TH>
                <TH>Duration</TH>
              </TR>
            </THead>
            <tbody>
              {[...open.breaks].reverse().map((b, i) => {
                const start = new Date(b.startedAt)
                const end = b.endedAt ? new Date(b.endedAt) : null
                const durationMin = end ? Math.round((end.getTime() - start.getTime()) / 60000) : null
                const isNamaz = b.type === 'namaz'
                return (
                  <TR key={b.id}>
                    <TD>{i + 1}</TD>
                    <TD>{isNamaz ? <Badge tone="success">🕌 Namaz</Badge> : <Badge tone="neutral">☕ Break</Badge>}</TD>
                    <TD>{start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</TD>
                    <TD>{end ? end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : <Badge tone="warn">in progress</Badge>}</TD>
                    <TD>{durationMin !== null ? formatMinutes(durationMin) : '—'}</TD>
                  </TR>
                )
              })}
            </tbody>
          </Table>
        </Card>
      )}

      <Card>
        <CardHeader
          title="Log extra hours"
          subtitle="Worked outside your shift? Submit it here — your manager will review."
        />
        <ExtraHoursForm />
      </Card>

      {overtimeEntries.length > 0 && (
        <Card>
          <CardHeader
            title="My extra-hours entries"
            subtitle={`${overtimeEntries.length} submission${overtimeEntries.length === 1 ? '' : 's'} in the last 60 days`}
          />
          <Table>
            <THead>
              <TR>
                <TH>Date</TH>
                <TH>Hours</TH>
                <TH>Reason</TH>
                <TH>Status</TH>
                <TH>Submitted</TH>
                <TH></TH>
              </TR>
            </THead>
            <tbody>
              {overtimeEntries.map((e) => {
                const tone =
                  e.status === 'approved' ? 'success'
                  : e.status === 'rejected' ? 'danger'
                  : e.status === 'cancelled' ? 'neutral'
                  : 'warn'
                return (
                  <TR key={e.id}>
                    <TD>{new Date(e.workDate).toLocaleDateString()}</TD>
                    <TD>{e.hours.toFixed(2)}h</TD>
                    <TD>{e.reason}</TD>
                    <TD><Badge tone={tone}>{e.status}</Badge></TD>
                    <TD>{new Date(e.createdAt).toLocaleDateString()}</TD>
                    <TD>{e.status === 'pending' && <CancelEntryButton id={e.id} />}</TD>
                  </TR>
                )
              })}
            </tbody>
          </Table>
        </Card>
      )}

      <Card>
        <CardHeader title="Recent attendance" subtitle="Last 30 days" />
        <Table>
          <THead>
            <TR>
              <TH>Date</TH>
              <TH>In</TH>
              <TH>Out</TH>
              <TH>Net Hours</TH>
              <TH>Overtime</TH>
              <TH>Break</TH>
              <TH>Namaz</TH>
              <TH>Status</TH>
              <TH>Source</TH>
            </TR>
          </THead>
          <tbody>
            {logs.length === 0 && (
              <TR><TD>No attendance logs yet.</TD><TD></TD><TD></TD><TD></TD><TD></TD><TD></TD><TD></TD><TD></TD><TD></TD></TR>
            )}
            {logs.map((l) => {
              const inDate = new Date(l.clockIn)
              const outDate = l.clockOut ? new Date(l.clockOut) : null
              const regularMin = breakMinutes(l.breaks, outDate, 'regular')
              const namazMin = breakMinutes(l.breaks, outDate, 'namaz')
              // Prefer stored values (authoritative once clocked out). Fall back
              // to live computation for open or legacy rows.
              const netHours =
                l.netHours != null
                  ? l.netHours.toFixed(2)
                  : outDate
                  ? (((outDate.getTime() - inDate.getTime()) - regularMin * 60000) / 3600000).toFixed(2)
                  : '—'
              const overtime = l.overtimeHours > 0 ? `${l.overtimeHours.toFixed(2)}h` : '—'
              return (
                <TR key={l.id}>
                  <TD>{inDate.toLocaleDateString()}</TD>
                  <TD>{inDate.toLocaleTimeString()}</TD>
                  <TD>{outDate ? outDate.toLocaleTimeString() : '—'}</TD>
                  <TD>{netHours}</TD>
                  <TD>{l.overtimeHours > 0 ? <Badge tone="warn">{overtime}</Badge> : '—'}</TD>
                  <TD>{regularMin > 0 ? formatMinutes(regularMin) : '—'}</TD>
                  <TD>{namazMin > 0 ? `🕌 ${formatMinutes(namazMin)}` : '—'}</TD>
                  <TD><Badge tone={l.status === 'overtime' ? 'warn' : l.status === 'missed' ? 'danger' : 'neutral'}>{l.status}</Badge></TD>
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
