import { Card, CardHeader } from '@/lib/ui/Card'
import { Table, THead, TR, TH } from '@/lib/ui/Table'
import { listLeavePolicies } from '@/lib/modules/leave-policies'
import { NewLeavePolicyForm } from './NewLeavePolicyForm'
import { PolicyRow } from './PolicyRow'

export default async function LeavePoliciesPage() {
  const policies = await listLeavePolicies()
  const activeCount = policies.filter((p) => p.active).length

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader
            title="Leave policies"
            subtitle="System-wide policies and entitlements"
            action={
              <span className="text-xs text-foreground-muted">
                {activeCount} active · {policies.length} total
              </span>
            }
          />
          {policies.length === 0 ? (
            <p className="text-sm text-foreground-muted">
              No leave policies yet. Create one on the right to get started.
            </p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Name</TH>
                  <TH>Type</TH>
                  <TH>Annual entitlement</TH>
                  <TH>Carry-forward max</TH>
                  <TH>Status</TH>
                  <TH>Actions</TH>
                </TR>
              </THead>
              <tbody>
                {policies.map((p) => (
                  <PolicyRow key={p.id} policy={p} />
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>
      <div>
        <Card>
          <CardHeader title="New leave policy" subtitle="Add a new entitlement type" />
          <NewLeavePolicyForm />
        </Card>
      </div>
    </div>
  )
}
