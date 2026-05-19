import { requireUser } from '@/lib/modules/auth'
import { listPoliciesForEmployee } from '@/lib/modules/policies'
import { Card, CardHeader } from '@/lib/ui/Card'
import { Badge } from '@/lib/ui/Table'
import { PageHeader } from '@/lib/ui/PageHeader'
import { AcknowledgeButton } from './AcknowledgeButton'

export default async function PoliciesPage() {
  const user = await requireUser()
  const policies = await listPoliciesForEmployee(user.id)

  const grouped = new Map<string, typeof policies>()
  for (const p of policies) {
    const list = grouped.get(p.category) ?? []
    list.push(p)
    grouped.set(p.category, list)
  }

  const pendingAck = policies.filter((p) => p.requiresAck && !p.acknowledged).length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Company policies"
        description={pendingAck > 0 ? `You have ${pendingAck} policy/policies to acknowledge.` : 'All up to date.'}
      />

      {Array.from(grouped.entries()).map(([category, list]) => (
        <Card key={category}>
          <CardHeader title={category.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())} subtitle={`${list.length} policy/policies`} />
          <div className="space-y-4">
            {list.map((p) => (
              <div key={p.id} className="rounded-md border border-border p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base font-semibold">{p.title} <span className="text-xs text-foreground-muted">v{p.version}</span></h3>
                  {p.requiresAck ? (
                    p.acknowledged ? <Badge tone="success" dot>Acknowledged</Badge>
                                   : <Badge tone="warn" dot>Action required</Badge>
                  ) : <Badge tone="neutral">Informational</Badge>}
                </div>
                <pre className="whitespace-pre-wrap rounded bg-surface-muted p-3 text-xs text-foreground">{p.body}</pre>
                {p.requiresAck && !p.acknowledged && (
                  <div className="mt-3"><AcknowledgeButton policyId={p.id} /></div>
                )}
              </div>
            ))}
          </div>
        </Card>
      ))}

      {policies.length === 0 && (
        <Card><p className="text-sm text-foreground-muted">No active policies.</p></Card>
      )}
    </div>
  )
}
