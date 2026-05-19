import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db/client'
import { getLicense } from '@/lib/modules/assets'
import { Card, CardHeader } from '@/lib/ui/Card'
import { Badge, Table, THead, TR, TH, TD } from '@/lib/ui/Table'
import { PageHeader } from '@/lib/ui/PageHeader'
import { AssignLicenseForm } from './AssignLicenseForm'
import { RevokeLicenseButton } from './RevokeLicenseButton'

export default async function LicenseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [license, employees] = await Promise.all([
    getLicense(id),
    prisma.employee.findMany({
      where: { status: 'active' },
      select: { id: true, firstName: true, lastName: true, employeeCode: true },
      orderBy: [{ lastName: 'asc' }],
    }),
  ])
  if (!license) notFound()
  const seatsLeft = license.seats - license.seatsUsed

  return (
    <div className="space-y-6">
      <PageHeader
        title={license.name}
        description={`${license.vendor ?? 'No vendor'} · ${license.licenseType}`}
        breadcrumbs={<Link href="/admin/licenses" className="hover:underline">← Licenses</Link>}
        actions={
          <Badge tone={seatsLeft <= 0 ? 'danger' : seatsLeft < 3 ? 'warn' : 'success'}>
            {license.seatsUsed} / {license.seats} seats used
          </Badge>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card padding="none">
            <div className="px-5 pt-5">
              <CardHeader title="Assignments" />
            </div>
            <Table>
              <THead>
                <TR><TH>Employee</TH><TH>Assigned</TH><TH>Status</TH><TH></TH></TR>
              </THead>
              <tbody>
                {license.assignments.length === 0 && <TR><TD>No assignments yet.</TD></TR>}
                {license.assignments.map((a) => (
                  <TR key={a.id}>
                    <TD>{a.employee.firstName} {a.employee.lastName} ({a.employee.employeeCode})</TD>
                    <TD>{new Date(a.assignedAt).toLocaleDateString()}</TD>
                    <TD>{a.revokedAt ? <Badge tone="neutral">revoked {new Date(a.revokedAt).toLocaleDateString()}</Badge> : <Badge tone="success" dot>active</Badge>}</TD>
                    <TD>{!a.revokedAt && <RevokeLicenseButton id={a.id} />}</TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Details" />
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <dt className="text-foreground-muted">Cost</dt>
              <dd>{license.cost != null ? `${license.cost.toFixed(2)} ${license.currency}` : '—'}</dd>
              <dt className="text-foreground-muted">Renewal</dt>
              <dd>{license.renewalDate ? new Date(license.renewalDate).toLocaleDateString() : '—'}</dd>
              <dt className="text-foreground-muted">Created</dt>
              <dd>{new Date(license.createdAt).toLocaleDateString()}</dd>
            </dl>
            {license.notes && <p className="mt-3 rounded-md bg-surface-muted p-3 text-sm">{license.notes}</p>}
          </Card>

          {seatsLeft > 0 ? (
            <Card>
              <CardHeader title="Assign a seat" subtitle={`${seatsLeft} seat${seatsLeft === 1 ? '' : 's'} available`} />
              <AssignLicenseForm licenseId={license.id} employees={employees} />
            </Card>
          ) : (
            <Card>
              <CardHeader title="Assign a seat" />
              <p className="text-sm text-foreground-muted">No seats available. Revoke an assignment or increase the seat count first.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
