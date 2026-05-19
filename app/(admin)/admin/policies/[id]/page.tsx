import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db/client'
import { getPolicy } from '@/lib/modules/policies'
import { Card, CardHeader } from '@/lib/ui/Card'
import { Table, THead, TR, TH, TD, Badge } from '@/lib/ui/Table'
import { PageHeader } from '@/lib/ui/PageHeader'
import { EditPolicyForm } from './EditPolicyForm'
import { ToggleActiveButton } from './ToggleActiveButton'

export default async function PolicyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const policy = await getPolicy(id)
  if (!policy) notFound()

  const acks = await prisma.policyAcknowledgement.findMany({
    where: { policyId: id, version: policy.version },
    include: { user: { select: { email: true, employee: { select: { firstName: true, lastName: true, employeeCode: true } } } } },
    orderBy: { acknowledgedAt: 'desc' },
    take: 200,
  })

  const activeUserCount = await prisma.user.count({ where: { status: 'active' } })
  const ackPct = activeUserCount === 0 ? 0 : Math.round((acks.length / activeUserCount) * 100)

  return (
    <div className="space-y-6">
      <PageHeader
        title={policy.title}
        description={`v${policy.version} — ${policy.category.replace(/_/g, ' ')}`}
        breadcrumbs={<Link href="/admin/policies" className="hover:underline">Policies</Link>}
        actions={<Badge tone={policy.active ? 'success' : 'neutral'} dot>{policy.active ? 'active' : 'archived'}</Badge>}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader title="Edit" subtitle="Changing the body auto-bumps the version (re-acknowledgement required)." />
            <EditPolicyForm policy={{ id: policy.id, title: policy.title, category: policy.category, body: policy.body, requiresAck: policy.requiresAck }} />
            <div className="mt-4 border-t border-border pt-4">
              <ToggleActiveButton id={policy.id} active={policy.active} />
            </div>
          </Card>

          <Card>
            <CardHeader title={`Acknowledgements (v${policy.version})`} subtitle={`${acks.length} of ${activeUserCount} (${ackPct}%)`} />
            <Table>
              <THead><TR><TH>User</TH><TH>Acknowledged</TH></TR></THead>
              <tbody>
                {acks.length === 0 && <TR><TD>No acknowledgements yet.</TD></TR>}
                {acks.map((a) => (
                  <TR key={a.id}>
                    <TD>
                      {a.user.employee ? `${a.user.employee.firstName} ${a.user.employee.lastName}` : a.user.email}
                      {a.user.employee && <span className="ml-1 text-xs text-foreground-muted">({a.user.employee.employeeCode})</span>}
                    </TD>
                    <TD className="text-xs text-foreground-muted">{new Date(a.acknowledgedAt).toLocaleString()}</TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader title="Preview" />
            <pre className="whitespace-pre-wrap text-xs text-foreground">{policy.body}</pre>
          </Card>
        </div>
      </div>
    </div>
  )
}
