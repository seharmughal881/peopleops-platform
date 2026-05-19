import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/db/client'
import { getEmployeeById } from '@/lib/modules/employee'
import { listDocumentsFor } from '@/lib/modules/employee/documents'
import { listSalaryHistory } from '@/lib/modules/employee/salary'
import { parseEmergencyContacts } from '@/lib/modules/employee/contacts-schema'
import { Card, CardHeader } from '@/lib/ui/Card'
import { Table, THead, TR, TH, TD, Badge } from '@/lib/ui/Table'
import { UploadDocForm } from '@/app/(employee)/documents/UploadDocForm'
import { AddSalaryForm } from './AddSalaryForm'
import { DeleteDocButton } from './DeleteDocButton'
import { GdprPanel } from './GdprPanel'

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [employee, docs, salaries, employment] = await Promise.all([
    getEmployeeById(id),
    listDocumentsFor(id),
    listSalaryHistory(id),
    prisma.employmentHistory.findMany({ where: { employeeId: id }, orderBy: { startDate: 'desc' } }),
  ])
  if (!employee) notFound()
  const contacts = parseEmergencyContacts(employee.profile?.emergencyContacts)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{employee.firstName} {employee.lastName}</h1>
          <p className="text-sm text-foreground-muted">
            {employee.employeeCode} · {employee.jobTitle ?? '—'} · {employee.department?.name ?? 'Unassigned'}
          </p>
        </div>
        <Link href="/admin/employees" className="text-sm text-foreground-muted hover:underline">← Back to directory</Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Overview" />
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <dt className="text-foreground-muted">Email</dt><dd>{employee.user.email}</dd>
            <dt className="text-foreground-muted">Join date</dt><dd>{new Date(employee.joinDate).toLocaleDateString()}</dd>
            <dt className="text-foreground-muted">Status</dt><dd><Badge tone={employee.status === 'active' ? 'success' : 'neutral'}>{employee.status}</Badge></dd>
            <dt className="text-foreground-muted">Phone</dt><dd>{employee.profile?.phone ?? '—'}</dd>
            <dt className="text-foreground-muted">Personal email</dt><dd>{employee.profile?.personalEmail ?? '—'}</dd>
            <dt className="text-foreground-muted">Address</dt><dd>{employee.profile?.address ?? '—'}</dd>
          </dl>
        </Card>

        <Card>
          <CardHeader title="Emergency contacts" />
          {contacts.length === 0 && <p className="text-sm text-foreground-muted">None on file.</p>}
          <ul className="space-y-2 text-sm">
            {contacts.map((c, i) => (
              <li key={i} className="flex justify-between border-b border-border pb-2">
                <span>{c.name} ({c.relation})</span>
                <span className="text-foreground-muted">{c.phone}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader title="Documents" subtitle={`${docs.length} on file`} />
            <Table>
              <THead>
                <TR><TH>Name</TH><TH>Type</TH><TH>Uploaded</TH><TH>Expires</TH><TH></TH></TR>
              </THead>
              <tbody>
                {docs.length === 0 && <TR><TD>No documents.</TD></TR>}
                {docs.map((d) => (
                  <TR key={d.id}>
                    <TD>{d.name}</TD>
                    <TD><Badge>{d.type}</Badge></TD>
                    <TD>{new Date(d.uploadedAt).toLocaleDateString()}</TD>
                    <TD>{d.expiresAt ? new Date(d.expiresAt).toLocaleDateString() : '—'}</TD>
                    <TD>
                      <div className="flex gap-2">
                        <Link href={`/api/files/${d.s3Key}`} target="_blank" className="text-accent-deep hover:underline">View</Link>
                        <DeleteDocButton id={d.id} />
                      </div>
                    </TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          </Card>
        </div>
        <div>
          <Card>
            <CardHeader title="Upload document" />
            <UploadDocForm employeeId={employee.id} />
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader title="Salary history" />
            <Table>
              <THead>
                <TR><TH>Effective</TH><TH>Amount</TH><TH>Currency</TH><TH>Reason</TH></TR>
              </THead>
              <tbody>
                {salaries.length === 0 && <TR><TD>No entries.</TD></TR>}
                {salaries.map((s) => (
                  <TR key={s.id}>
                    <TD>{new Date(s.effectiveDate).toLocaleDateString()}</TD>
                    <TD>{s.amount.toFixed(2)}</TD>
                    <TD>{s.currency}</TD>
                    <TD>{s.reason ?? '—'}</TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          </Card>
        </div>
        <div>
          <Card>
            <CardHeader title="Add salary entry" />
            <AddSalaryForm employeeId={employee.id} />
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader title="Employment history" />
        <Table>
          <THead>
            <TR><TH>Title</TH><TH>Start</TH><TH>End</TH><TH>Reason</TH></TR>
          </THead>
          <tbody>
            {employment.length === 0 && <TR><TD>No entries.</TD></TR>}
            {employment.map((e) => (
              <TR key={e.id}>
                <TD>{e.jobTitle}</TD>
                <TD>{new Date(e.startDate).toLocaleDateString()}</TD>
                <TD>{e.endDate ? new Date(e.endDate).toLocaleDateString() : 'current'}</TD>
                <TD>{e.reason ?? '—'}</TD>
              </TR>
            ))}
          </tbody>
        </Table>
      </Card>

      <GdprPanel employeeId={employee.id} employeeCode={employee.employeeCode} employeeName={`${employee.firstName} ${employee.lastName}`} />
    </div>
  )
}
