import Link from 'next/link'
import { prisma } from '@/lib/db/client'
import { Card, CardHeader } from '@/lib/ui/Card'
import { Table, THead, TR, TH, TD, Badge } from '@/lib/ui/Table'
import { PageHeader } from '@/lib/ui/PageHeader'
import { NewDeviceForm } from './NewDeviceForm'

export default async function BiometricDevicesPage() {
  const devices = await prisma.biometricDevice.findMany({
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    include: { _count: { select: { credentials: true } } },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Biometric devices"
        description="Register fingerprint / face-recognition / RFID devices and send clock events to /api/integrations/biometric/webhook."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader title="Devices" subtitle={`${devices.length} registered`} />
            <Table>
              <THead>
                <TR>
                  <TH>Name</TH><TH>Vendor</TH><TH>External ID</TH><TH>Enrolled</TH><TH>Last seen</TH><TH>Status</TH>
                </TR>
              </THead>
              <tbody>
                {devices.length === 0 && (
                  <TR><TD>No devices yet. Register one to begin.</TD></TR>
                )}
                {devices.map((d) => (
                  <TR key={d.id}>
                    <TD className="font-medium">
                      <Link href={`/admin/biometric/${d.id}`} className="text-accent-deep hover:underline">{d.name}</Link>
                      {d.location && <div className="text-xs text-foreground-muted">{d.location}</div>}
                    </TD>
                    <TD>{d.vendor}</TD>
                    <TD><code className="text-xs">{d.externalDeviceId}</code></TD>
                    <TD>{d._count.credentials}</TD>
                    <TD>{d.lastSeenAt ? new Date(d.lastSeenAt).toLocaleString() : '—'}</TD>
                    <TD>
                      <Badge tone={d.status === 'active' ? 'success' : 'neutral'} dot>{d.status}</Badge>
                    </TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader title="Register device" subtitle="Secret is shown once on creation." />
            <NewDeviceForm />
          </Card>
        </div>
      </div>
    </div>
  )
}
