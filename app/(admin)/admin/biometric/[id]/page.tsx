import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db/client'
import { Card, CardHeader } from '@/lib/ui/Card'
import { Table, THead, TR, TH, TD, Badge } from '@/lib/ui/Table'
import { PageHeader } from '@/lib/ui/PageHeader'
import { DeviceActions } from './DeviceActions'
import { EnrollForm } from './EnrollForm'
import { RemoveCredentialButton } from './RemoveCredentialButton'

export default async function BiometricDeviceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const device = await prisma.biometricDevice.findUnique({
    where: { id },
    include: {
      credentials: {
        include: { employee: { select: { firstName: true, lastName: true, employeeCode: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  })
  if (!device) notFound()

  const employees = await prisma.employee.findMany({
    where: { status: 'active' },
    select: { id: true, firstName: true, lastName: true, employeeCode: true },
    orderBy: [{ lastName: 'asc' }],
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title={device.name}
        description={device.location ?? undefined}
        breadcrumbs={
          <span>
            <Link href="/admin/biometric" className="hover:underline">Devices</Link> / {device.name}
          </span>
        }
        actions={<Badge tone={device.status === 'active' ? 'success' : 'neutral'} dot>{device.status}</Badge>}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader title="Device info" />
            <dl className="grid grid-cols-2 gap-y-3 text-sm">
              <dt className="text-foreground-muted">Vendor</dt><dd>{device.vendor}</dd>
              <dt className="text-foreground-muted">External ID</dt><dd><code>{device.externalDeviceId}</code></dd>
              <dt className="text-foreground-muted">Last seen</dt><dd>{device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString() : 'Never'}</dd>
              <dt className="text-foreground-muted">Created</dt><dd>{new Date(device.createdAt).toLocaleString()}</dd>
            </dl>
            <div className="mt-4 border-t border-border pt-4">
              <DeviceActions id={device.id} status={device.status} />
            </div>
          </Card>

          <Card>
            <CardHeader title="Enrolled employees" subtitle={`${device.credentials.length} credential(s)`} />
            <Table>
              <THead>
                <TR><TH>Employee</TH><TH>External ID on device</TH><TH>Label</TH><TH>Enrolled</TH><TH></TH></TR>
              </THead>
              <tbody>
                {device.credentials.length === 0 && <TR><TD>No enrollments yet.</TD></TR>}
                {device.credentials.map((c) => (
                  <TR key={c.id}>
                    <TD className="font-medium">{c.employee.firstName} {c.employee.lastName} <span className="text-xs text-foreground-muted">({c.employee.employeeCode})</span></TD>
                    <TD><code className="text-xs">{c.externalEmployeeId}</code></TD>
                    <TD>{c.label ?? '—'}</TD>
                    <TD className="text-xs text-foreground-muted">{new Date(c.createdAt).toLocaleDateString()}</TD>
                    <TD><RemoveCredentialButton id={c.id} /></TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader title="Enroll employee" subtitle="Map a device fingerprint/face ID to an employee." />
            <EnrollForm deviceId={device.id} employees={employees} />
          </Card>
        </div>
      </div>
    </div>
  )
}
