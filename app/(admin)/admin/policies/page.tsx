import Link from 'next/link'
import { listAllPolicies } from '@/lib/modules/policies'
import { Card, CardHeader } from '@/lib/ui/Card'
import { Table, THead, TR, TH, TD, Badge } from '@/lib/ui/Table'
import { PageHeader } from '@/lib/ui/PageHeader'
import { NewPolicyForm } from './NewPolicyForm'

export default async function PoliciesAdminPage() {
  const policies = await listAllPolicies()

  return (
    <div className="space-y-6">
      <PageHeader title="Policies" description="Publish company policies and track acknowledgements." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader title="All policies" subtitle={`${policies.length} defined`} />
            <Table>
              <THead>
                <TR><TH>Title</TH><TH>Category</TH><TH>Version</TH><TH>Acks</TH><TH>Published</TH><TH>Status</TH></TR>
              </THead>
              <tbody>
                {policies.length === 0 && <TR><TD>No policies yet.</TD></TR>}
                {policies.map((p) => (
                  <TR key={p.id}>
                    <TD className="font-medium">
                      <Link href={`/admin/policies/${p.id}`} className="text-accent-deep hover:underline">{p.title}</Link>
                    </TD>
                    <TD>{p.category.replace(/_/g, ' ')}</TD>
                    <TD>v{p.version}{p.requiresAck && <Badge tone="info">requires ack</Badge>}</TD>
                    <TD>{p._count.acknowledgements}</TD>
                    <TD className="text-xs text-foreground-muted">{new Date(p.publishedAt).toLocaleDateString()}</TD>
                    <TD><Badge tone={p.active ? 'success' : 'neutral'} dot>{p.active ? 'active' : 'archived'}</Badge></TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader title="New policy" />
            <NewPolicyForm />
          </Card>
        </div>
      </div>
    </div>
  )
}
