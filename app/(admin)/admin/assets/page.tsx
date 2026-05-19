import Link from 'next/link'
import { listAssets, assetsKPIs } from '@/lib/modules/assets'
import { Card, CardHeader, Stat } from '@/lib/ui/Card'
import { Badge, Table, THead, TR, TH, TD } from '@/lib/ui/Table'
import { PageHeader } from '@/lib/ui/PageHeader'
import { EmptyState } from '@/lib/ui/EmptyState'
import { NewAssetForm } from './NewAssetForm'

function statusTone(s: string) {
  if (s === 'available') return 'success' as const
  if (s === 'assigned') return 'info' as const
  if (s === 'maintenance') return 'warn' as const
  return 'neutral' as const
}

export default async function AssetsPage() {
  const [assets, kpis] = await Promise.all([listAssets(), assetsKPIs()])

  return (
    <div className="space-y-6">
      <PageHeader title="Assets" description="Devices, equipment, and other physical inventory." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Total" value={kpis.total} />
        <Stat label="Available" value={kpis.available} />
        <Stat label="Assigned" value={kpis.assigned} />
        <Stat label="In maintenance" value={kpis.maintenance} />
        <Stat label="Total value" value={`$${kpis.totalValue.toFixed(0)}`} hint="purchase cost" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card padding="none">
            <div className="px-5 pt-5">
              <CardHeader title="Inventory" subtitle={`${assets.length} item${assets.length === 1 ? '' : 's'}`} />
            </div>
            {assets.length === 0 ? (
              <div className="px-5 pb-5">
                <EmptyState title="No assets yet" description="Create your first asset to start tracking inventory." />
              </div>
            ) : (
              <Table>
                <THead>
                  <TR><TH>Tag</TH><TH>Name</TH><TH>Category</TH><TH>Status</TH><TH>Assigned to</TH><TH></TH></TR>
                </THead>
                <tbody>
                  {assets.map((a) => {
                    const current = a.assignments[0]
                    return (
                      <TR key={a.id}>
                        <TD className="font-mono text-xs">{a.tag}</TD>
                        <TD className="font-medium">
                          <Link href={`/admin/assets/${a.id}`} className="hover:underline">{a.name}</Link>
                        </TD>
                        <TD><Badge>{a.category}</Badge></TD>
                        <TD><Badge tone={statusTone(a.status)} dot>{a.status}</Badge></TD>
                        <TD>{current ? `${current.employee.firstName} ${current.employee.lastName}` : '—'}</TD>
                        <TD>
                          <Link href={`/admin/assets/${a.id}`} className="text-accent hover:underline">Open</Link>
                        </TD>
                      </TR>
                    )
                  })}
                </tbody>
              </Table>
            )}
          </Card>
        </div>
        <div>
          <Card>
            <CardHeader title="New asset" />
            <NewAssetForm />
          </Card>
        </div>
      </div>
    </div>
  )
}
