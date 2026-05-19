import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db/client'
import { getAsset } from '@/lib/modules/assets'
import { Card, CardHeader } from '@/lib/ui/Card'
import { Badge, Table, THead, TR, TH, TD } from '@/lib/ui/Table'
import { PageHeader } from '@/lib/ui/PageHeader'
import { AssignAssetForm } from './AssignAssetForm'
import { ReturnAssetForm } from './ReturnAssetForm'
import { AssetStatusButtons } from './AssetStatusButtons'

function statusTone(s: string) {
  if (s === 'available') return 'success' as const
  if (s === 'assigned') return 'info' as const
  if (s === 'maintenance') return 'warn' as const
  return 'neutral' as const
}

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [asset, employees] = await Promise.all([
    getAsset(id),
    prisma.employee.findMany({
      where: { status: 'active' },
      select: { id: true, firstName: true, lastName: true, employeeCode: true },
      orderBy: [{ lastName: 'asc' }],
    }),
  ])
  if (!asset) notFound()
  const active = asset.assignments.find((a) => !a.returnedAt)

  return (
    <div className="space-y-6">
      <PageHeader
        title={asset.name}
        description={`${asset.category} · tag ${asset.tag}${asset.serialNumber ? ` · S/N ${asset.serialNumber}` : ''}`}
        breadcrumbs={<Link href="/admin/assets" className="hover:underline">← Assets</Link>}
        actions={
          <div className="flex items-center gap-2">
            <Badge tone={statusTone(asset.status)} dot>{asset.status}</Badge>
            <AssetStatusButtons id={asset.id} status={asset.status} />
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Details" />
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <dt className="text-foreground-muted">Purchase date</dt>
            <dd>{asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString() : '—'}</dd>
            <dt className="text-foreground-muted">Warranty end</dt>
            <dd>{asset.warrantyEndDate ? new Date(asset.warrantyEndDate).toLocaleDateString() : '—'}</dd>
            <dt className="text-foreground-muted">Purchase cost</dt>
            <dd>{asset.purchaseCost ? `${asset.purchaseCost.toFixed(2)} ${asset.currency}` : '—'}</dd>
            <dt className="text-foreground-muted">Created</dt>
            <dd>{new Date(asset.createdAt).toLocaleDateString()}</dd>
          </dl>
          {asset.notes && (
            <p className="mt-4 rounded-md bg-surface-muted p-3 text-sm">{asset.notes}</p>
          )}
        </Card>

        <Card>
          <CardHeader title={active ? 'Currently assigned' : 'Assign to employee'} />
          {active ? (
            <ReturnAssetForm
              assignmentId={active.id}
              who={`${active.employee.firstName} ${active.employee.lastName}`}
              assignedAt={active.assignedAt}
            />
          ) : asset.status === 'available' ? (
            <AssignAssetForm assetId={asset.id} employees={employees} />
          ) : (
            <p className="text-sm text-foreground-muted">Asset is {asset.status} — cannot assign.</p>
          )}
        </Card>
      </div>

      <Card padding="none">
        <div className="px-5 pt-5">
          <CardHeader title="Assignment history" subtitle={`${asset.assignments.length} total`} />
        </div>
        {asset.assignments.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-foreground-muted">No assignments yet.</p>
        ) : (
          <Table>
            <THead>
              <TR><TH>Employee</TH><TH>Assigned</TH><TH>Returned</TH><TH>Condition</TH><TH>Notes</TH></TR>
            </THead>
            <tbody>
              {asset.assignments.map((a) => (
                <TR key={a.id}>
                  <TD>{a.employee.firstName} {a.employee.lastName} ({a.employee.employeeCode})</TD>
                  <TD>{new Date(a.assignedAt).toLocaleDateString()}</TD>
                  <TD>{a.returnedAt ? new Date(a.returnedAt).toLocaleDateString() : <Badge tone="info">active</Badge>}</TD>
                  <TD>{a.conditionReturn ? <Badge tone={a.conditionReturn === 'good' ? 'success' : 'danger'}>{a.conditionReturn}</Badge> : '—'}</TD>
                  <TD className="max-w-sm truncate">{a.notes ?? '—'}</TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  )
}
