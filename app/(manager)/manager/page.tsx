import { requireUser } from '@/lib/modules/auth'
import { listDirectReports } from '@/lib/modules/employee'
import { Card, CardHeader } from '@/lib/ui/Card'
import { Table, THead, TR, TH, TD, Badge } from '@/lib/ui/Table'

export default async function ManagerHome() {
  const user = await requireUser()
  if (!user.employee) return <Card>No employee record.</Card>

  const reports = await listDirectReports(user.employee.id)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Your team" subtitle={`${reports.length} direct report${reports.length === 1 ? '' : 's'}`} />
        <Table>
          <THead>
            <TR>
              <TH>Name</TH>
              <TH>Title</TH>
              <TH>Department</TH>
              <TH>Status</TH>
            </TR>
          </THead>
          <tbody>
            {reports.length === 0 && (
              <TR><TD>No direct reports.</TD><TD></TD><TD></TD><TD></TD></TR>
            )}
            {reports.map((e) => (
              <TR key={e.id}>
                <TD>{e.firstName} {e.lastName}</TD>
                <TD>{e.jobTitle ?? '—'}</TD>
                <TD>{e.department?.name ?? '—'}</TD>
                <TD><Badge tone={e.status === 'active' ? 'success' : 'neutral'}>{e.status}</Badge></TD>
              </TR>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  )
}
