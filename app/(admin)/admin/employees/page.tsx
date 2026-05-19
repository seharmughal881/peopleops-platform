import Link from 'next/link'
import { listEmployees } from '@/lib/modules/employee'
import { Card, CardHeader } from '@/lib/ui/Card'
import { Table, THead, TR, TH, TD, Badge } from '@/lib/ui/Table'

export default async function EmployeesPage() {
  const employees = await listEmployees()

  return (
    <Card>
      <CardHeader
        title="Employee directory"
        subtitle={`${employees.length} total`}
        action={
          <Link
            href="/admin/employees/new"
            className="gradient-accent inline-flex h-9 items-center justify-center rounded-md px-3.5 text-sm font-medium text-accent-foreground shadow-xs transition-shadow hover:shadow-[0_6px_20px_-10px_var(--accent-glow)]"
          >
            Add employee
          </Link>
        }
      />
      <Table>
        <THead>
          <TR>
            <TH>Code</TH>
            <TH>Name</TH>
            <TH>Email</TH>
            <TH>Title</TH>
            <TH>Department</TH>
            <TH>Status</TH>
          </TR>
        </THead>
        <tbody>
          {employees.length === 0 && (
            <TR><TD>No employees yet.</TD></TR>
          )}
          {employees.map((e) => (
            <TR key={e.id}>
              <TD>{e.employeeCode}</TD>
              <TD>
                <Link href={`/admin/employees/${e.id}`} className="font-medium text-accent-deep hover:underline">
                  {e.firstName} {e.lastName}
                </Link>
              </TD>
              <TD>{e.user.email}</TD>
              <TD>{e.jobTitle ?? '—'}</TD>
              <TD>{e.department?.name ?? '—'}</TD>
              <TD><Badge tone={e.status === 'active' ? 'success' : 'neutral'}>{e.status}</Badge></TD>
            </TR>
          ))}
        </tbody>
      </Table>
    </Card>
  )
}
