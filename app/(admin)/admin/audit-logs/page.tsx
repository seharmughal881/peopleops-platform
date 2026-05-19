import { listAuditLogs } from '@/lib/modules/audit'
import { Card, CardHeader } from '@/lib/ui/Card'
import { Table, THead, TR, TH, TD, Badge } from '@/lib/ui/Table'

export default async function AuditLogsPage() {
  const logs = await listAuditLogs({ limit: 200 })
  return (
    <Card>
      <CardHeader title="Audit logs" subtitle="Most recent 200 events" />
      <Table>
        <THead>
          <TR>
            <TH>When</TH>
            <TH>Actor</TH>
            <TH>Action</TH>
            <TH>Entity</TH>
          </TR>
        </THead>
        <tbody>
          {logs.length === 0 && <TR><TD>No audit events yet.</TD></TR>}
          {logs.map((l) => (
            <TR key={l.id}>
              <TD>{new Date(l.createdAt).toLocaleString()}</TD>
              <TD>{l.user?.email ?? 'system'}</TD>
              <TD><Badge tone="info">{l.action}</Badge></TD>
              <TD>{l.entityType ? `${l.entityType}:${l.entityId}` : '—'}</TD>
            </TR>
          ))}
        </tbody>
      </Table>
    </Card>
  )
}
