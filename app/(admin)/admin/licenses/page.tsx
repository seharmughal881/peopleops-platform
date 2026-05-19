import Link from 'next/link'
import { listLicenses } from '@/lib/modules/assets'
import { Card, CardHeader } from '@/lib/ui/Card'
import { Badge, Table, THead, TR, TH, TD } from '@/lib/ui/Table'
import { PageHeader } from '@/lib/ui/PageHeader'
import { EmptyState } from '@/lib/ui/EmptyState'
import { NewLicenseForm } from './NewLicenseForm'

function renewalTone(d: Date | null) {
  if (!d) return 'neutral' as const
  const days = (new Date(d).getTime() - Date.now()) / 86400000
  if (days < 0) return 'danger' as const
  if (days < 30) return 'warn' as const
  return 'success' as const
}

export default async function LicensesPage() {
  const licenses = await listLicenses()

  return (
    <div className="space-y-6">
      <PageHeader title="Software licenses" description="Subscriptions, seats, and renewals." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card padding="none">
            <div className="px-5 pt-5">
              <CardHeader title="Licenses" subtitle={`${licenses.length} total`} />
            </div>
            {licenses.length === 0 ? (
              <div className="px-5 pb-5">
                <EmptyState title="No licenses yet" description="Add a software license to start tracking seats." />
              </div>
            ) : (
              <Table>
                <THead>
                  <TR><TH>Name</TH><TH>Vendor</TH><TH>Type</TH><TH>Seats used</TH><TH>Renewal</TH><TH></TH></TR>
                </THead>
                <tbody>
                  {licenses.map((l) => (
                    <TR key={l.id}>
                      <TD className="font-medium">
                        <Link href={`/admin/licenses/${l.id}`} className="hover:underline">{l.name}</Link>
                      </TD>
                      <TD>{l.vendor ?? '—'}</TD>
                      <TD><Badge>{l.licenseType}</Badge></TD>
                      <TD className="tabular-nums">{l.seatsUsed} / {l.seats}</TD>
                      <TD>
                        {l.renewalDate ? (
                          <Badge tone={renewalTone(l.renewalDate)} dot>
                            {new Date(l.renewalDate).toLocaleDateString()}
                          </Badge>
                        ) : '—'}
                      </TD>
                      <TD>
                        <Link href={`/admin/licenses/${l.id}`} className="text-accent hover:underline">Open</Link>
                      </TD>
                    </TR>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </div>
        <div>
          <Card>
            <CardHeader title="New license" />
            <NewLicenseForm />
          </Card>
        </div>
      </div>
    </div>
  )
}
