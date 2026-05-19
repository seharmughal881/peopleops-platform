import { listAllHiringRequests } from '@/lib/modules/recruitment/hiring-requests'
import { Card, CardHeader } from '@/lib/ui/Card'
import { Table, THead, TR, TH, TD, Badge } from '@/lib/ui/Table'
import { PageHeader } from '@/lib/ui/PageHeader'
import { DecideForm } from './DecideForm'

export default async function AdminHiringRequestsPage() {
  const all = await listAllHiringRequests()

  return (
    <div className="space-y-6">
      <PageHeader title="Hiring requests" description="Review manager-initiated requests for new headcount." />

      <Card>
        <CardHeader title="All requests" subtitle={`${all.length}`} />
        <Table>
          <THead>
            <TR><TH>Requested by</TH><TH>Title</TH><TH>Dept</TH><TH>Headcount</TH><TH>Urgency</TH><TH>Budget</TH><TH>Status</TH><TH>Created</TH><TH></TH></TR>
          </THead>
          <tbody>
            {all.length === 0 && <TR><TD>None.</TD></TR>}
            {all.map((r) => {
              const tone = r.status === 'approved' ? 'success' : r.status === 'rejected' ? 'danger' : r.status === 'withdrawn' ? 'neutral' : 'warn'
              return (
                <TR key={r.id}>
                  <TD>{r.requestedBy.firstName} {r.requestedBy.lastName} <span className="text-xs text-foreground-muted">({r.requestedBy.employeeCode})</span></TD>
                  <TD className="font-medium">
                    {r.jobTitle}
                    <div className="line-clamp-2 text-xs text-foreground-muted">{r.justification}</div>
                  </TD>
                  <TD>{r.department?.name ?? '—'}</TD>
                  <TD>{r.headcount}</TD>
                  <TD>{r.urgency}</TD>
                  <TD>{r.proposedBudget != null ? `$${r.proposedBudget.toLocaleString()}` : '—'}</TD>
                  <TD><Badge tone={tone}>{r.status}</Badge></TD>
                  <TD className="text-xs text-foreground-muted">{new Date(r.createdAt).toLocaleDateString()}</TD>
                  <TD>{r.status === 'pending' && <DecideForm id={r.id} />}</TD>
                </TR>
              )
            })}
          </tbody>
        </Table>
      </Card>
    </div>
  )
}
