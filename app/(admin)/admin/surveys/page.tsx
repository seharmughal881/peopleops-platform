import Link from 'next/link'
import { listAllSurveys } from '@/lib/modules/comms'
import { Card, CardHeader } from '@/lib/ui/Card'
import { Badge, Table, THead, TR, TH, TD } from '@/lib/ui/Table'
import { PageHeader } from '@/lib/ui/PageHeader'
import { EmptyState } from '@/lib/ui/EmptyState'
import { NewSurveyForm } from './NewSurveyForm'

function statusTone(s: string) {
  if (s === 'active') return 'success' as const
  if (s === 'closed') return 'neutral' as const
  return 'warn' as const
}

export default async function AdminSurveysPage() {
  const surveys = await listAllSurveys()
  return (
    <div className="space-y-6">
      <PageHeader title="Surveys" description="Create and manage surveys / polls. Employees take active surveys from /surveys." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card padding="none">
            <div className="px-5 pt-5">
              <CardHeader title="All surveys" subtitle={`${surveys.length} total`} />
            </div>
            {surveys.length === 0 ? (
              <div className="px-5 pb-5"><EmptyState title="No surveys yet" description="Create your first survey to collect feedback." /></div>
            ) : (
              <Table>
                <THead>
                  <TR><TH>Title</TH><TH>Status</TH><TH>Anonymous</TH><TH>Responses</TH><TH></TH></TR>
                </THead>
                <tbody>
                  {surveys.map((s) => (
                    <TR key={s.id}>
                      <TD className="font-medium">{s.title}</TD>
                      <TD><Badge tone={statusTone(s.status)} dot>{s.status}</Badge></TD>
                      <TD>{s.anonymous ? <Badge tone="info">yes</Badge> : '—'}</TD>
                      <TD className="tabular-nums">{s._count.responses}</TD>
                      <TD>
                        <Link href={`/admin/surveys/${s.id}`} className="text-accent hover:underline">Open</Link>
                      </TD>
                    </TR>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </div>
        <div>
          <Card>
            <CardHeader title="New survey" subtitle="Starts as draft. Activate to allow responses." />
            <NewSurveyForm />
          </Card>
        </div>
      </div>
    </div>
  )
}
