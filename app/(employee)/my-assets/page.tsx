import { requireUser } from '@/lib/modules/auth'
import { myAssetsAndLicenses } from '@/lib/modules/assets'
import { Card, CardHeader } from '@/lib/ui/Card'
import { Badge, Table, THead, TR, TH, TD } from '@/lib/ui/Table'
import { PageHeader } from '@/lib/ui/PageHeader'
import { EmptyState } from '@/lib/ui/EmptyState'

export default async function MyAssetsPage() {
  const user = await requireUser()
  if (!user.employee) return <Card>No employee record.</Card>

  const { assets, licenses } = await myAssetsAndLicenses(user.employee.id)

  return (
    <div className="space-y-6">
      <PageHeader title="My equipment" description="Devices and software licenses assigned to you." />

      <Card padding="none">
        <div className="px-5 pt-5">
          <CardHeader title="Devices & equipment" subtitle={`${assets.length} assigned`} />
        </div>
        {assets.length === 0 ? (
          <div className="px-5 pb-5">
            <EmptyState title="No assets assigned" description="If you should have something, contact IT Ops." />
          </div>
        ) : (
          <Table>
            <THead>
              <TR><TH>Tag</TH><TH>Item</TH><TH>Category</TH><TH>Assigned</TH><TH>Serial</TH></TR>
            </THead>
            <tbody>
              {assets.map((a) => (
                <TR key={a.id}>
                  <TD className="font-mono text-xs">{a.asset.tag}</TD>
                  <TD className="font-medium">{a.asset.name}</TD>
                  <TD><Badge>{a.asset.category}</Badge></TD>
                  <TD>{new Date(a.assignedAt).toLocaleDateString()}</TD>
                  <TD className="text-foreground-muted">{a.asset.serialNumber ?? '—'}</TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Card padding="none">
        <div className="px-5 pt-5">
          <CardHeader title="Software licenses" subtitle={`${licenses.length} active`} />
        </div>
        {licenses.length === 0 ? (
          <div className="px-5 pb-5">
            <EmptyState title="No licenses assigned" description="Need access to a tool? Ask IT Ops." />
          </div>
        ) : (
          <Table>
            <THead>
              <TR><TH>Name</TH><TH>Vendor</TH><TH>Type</TH><TH>Assigned</TH></TR>
            </THead>
            <tbody>
              {licenses.map((a) => (
                <TR key={a.id}>
                  <TD className="font-medium">{a.license.name}</TD>
                  <TD>{a.license.vendor ?? '—'}</TD>
                  <TD><Badge>{a.license.licenseType}</Badge></TD>
                  <TD>{new Date(a.assignedAt).toLocaleDateString()}</TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  )
}
