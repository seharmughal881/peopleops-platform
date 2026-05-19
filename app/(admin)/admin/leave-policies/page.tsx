import { prisma } from '@/lib/db/client'
import { Card, CardHeader } from '@/lib/ui/Card'
import { Table, THead, TR, TH, TD, Badge } from '@/lib/ui/Table'

export default async function LeavePoliciesPage() {
  const policies = await prisma.leavePolicy.findMany({ orderBy: { name: 'asc' } })
  return (
    <Card>
      <CardHeader title="Leave policies" subtitle="System-wide policies and entitlements" />
      <Table>
        <THead>
          <TR>
            <TH>Name</TH>
            <TH>Type</TH>
            <TH>Annual entitlement</TH>
            <TH>Carry-forward max</TH>
            <TH>Status</TH>
          </TR>
        </THead>
        <tbody>
          {policies.map((p) => (
            <TR key={p.id}>
              <TD>{p.name}</TD>
              <TD>{p.leaveType}</TD>
              <TD>{p.annualEntitlement} days</TD>
              <TD>{p.carryForwardMax} days</TD>
              <TD><Badge tone={p.active ? 'success' : 'neutral'}>{p.active ? 'active' : 'inactive'}</Badge></TD>
            </TR>
          ))}
        </tbody>
      </Table>
    </Card>
  )
}
