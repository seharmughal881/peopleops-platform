import { prisma } from '@/lib/db/client'
import { Card, CardHeader } from '@/lib/ui/Card'
import { Table, THead, TR, TH, TD, Badge } from '@/lib/ui/Table'
import { PageHeader } from '@/lib/ui/PageHeader'
import { NewRuleForm } from './NewRuleForm'
import { RuleRowActions } from './RuleRowActions'

export default async function WorkflowsPage() {
  const rules = await prisma.approvalRule.findMany({
    orderBy: [{ entityType: 'asc' }, { priority: 'asc' }],
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approval workflows"
        description="Define rule-based approval chains. Lowest priority wins. If no rule matches, the legacy default (manager → HR admin) is used."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader title="Rules" subtitle={`${rules.length} configured`} />
            <Table>
              <THead>
                <TR><TH>Name</TH><TH>Entity</TH><TH>Priority</TH><TH>Condition</TH><TH>Approver chain</TH><TH>Status</TH><TH></TH></TR>
              </THead>
              <tbody>
                {rules.length === 0 && <TR><TD>No rules yet. Without rules, default approvers apply.</TD></TR>}
                {rules.map((r) => (
                  <TR key={r.id}>
                    <TD className="font-medium">{r.name}</TD>
                    <TD>{r.entityType}</TD>
                    <TD>{r.priority}</TD>
                    <TD><code className="text-xs">{r.condition === '{}' ? 'always' : r.condition}</code></TD>
                    <TD><code className="text-xs">{r.approverChain}</code></TD>
                    <TD><Badge tone={r.active ? 'success' : 'neutral'} dot>{r.active ? 'active' : 'disabled'}</Badge></TD>
                    <TD><RuleRowActions id={r.id} active={r.active} /></TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader title="New rule" subtitle="Lower priority = checked first" />
            <NewRuleForm />
          </Card>
        </div>
      </div>
    </div>
  )
}
