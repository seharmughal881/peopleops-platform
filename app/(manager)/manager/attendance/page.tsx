import { requireUser } from '@/lib/modules/auth'
import { listTeamAttendance } from '@/lib/modules/attendance'
import { Card, CardHeader } from '@/lib/ui/Card'
import { Table, THead, TR, TH, TD, Badge } from '@/lib/ui/Table'

export default async function TeamAttendancePage() {
  const user = await requireUser()
  if (!user.employee) return <Card>No employee record.</Card>

  const logs = await listTeamAttendance(user.employee.id)

  return (
    <Card>
      <CardHeader title="Team attendance today" />
      <Table>
        <THead>
          <TR>
            <TH>Employee</TH>
            <TH>Clock in</TH>
            <TH>Clock out</TH>
            <TH>Status</TH>
          </TR>
        </THead>
        <tbody>
          {logs.length === 0 && (
            <TR><TD>No attendance recorded today.</TD><TD></TD><TD></TD><TD></TD></TR>
          )}
          {logs.map((l) => (
            <TR key={l.id}>
              <TD>{l.employee.firstName} {l.employee.lastName}</TD>
              <TD>{new Date(l.clockIn).toLocaleTimeString()}</TD>
              <TD>{l.clockOut ? new Date(l.clockOut).toLocaleTimeString() : '—'}</TD>
              <TD><Badge tone={l.status === 'overtime' ? 'warn' : 'neutral'}>{l.status}</Badge></TD>
            </TR>
          ))}
        </tbody>
      </Table>
    </Card>
  )
}
