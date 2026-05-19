import Link from 'next/link'
import { listJobs, recruitmentKPIs } from '@/lib/modules/recruitment'
import { Card, CardHeader, Stat } from '@/lib/ui/Card'
import { Badge, Table, THead, TR, TH, TD } from '@/lib/ui/Table'
import { PageHeader } from '@/lib/ui/PageHeader'
import { EmptyState } from '@/lib/ui/EmptyState'
import { NewJobForm } from './NewJobForm'

function jobTone(s: string) {
  if (s === 'open') return 'success' as const
  if (s === 'filled') return 'info' as const
  if (s === 'closed') return 'neutral' as const
  return 'warn' as const
}

export default async function RecruitmentPage() {
  const [jobs, kpis] = await Promise.all([listJobs(), recruitmentKPIs()])

  return (
    <div className="space-y-6">
      <PageHeader title="Recruitment" description="Job postings, candidate pipeline, interviews, and offers." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Open jobs" value={kpis.openJobs} />
        <Stat label="Filled" value={kpis.filledJobs} />
        <Stat label="In pipeline" value={kpis.funnel.applied + kpis.funnel.screening + kpis.funnel.interview + kpis.funnel.offer} />
        <Stat label="Offers sent" value={kpis.offersSent} />
        <Stat label="Offers accepted" value={kpis.offersAccepted} />
      </div>

      <Card>
        <CardHeader title="Hiring funnel" subtitle="Active candidates across the pipeline" />
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 lg:grid-cols-6">
          {(['applied', 'screening', 'interview', 'offer', 'hired', 'rejected'] as const).map((stage) => (
            <div key={stage} className="rounded-md border border-border bg-surface-muted px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-foreground-muted">{stage}</p>
              <p className="text-2xl font-semibold tabular-nums">{kpis.funnel[stage]}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card padding="none">
            <div className="px-5 pt-5">
              <CardHeader title="Job postings" subtitle={`${jobs.length} total`} />
            </div>
            {jobs.length === 0 ? (
              <div className="px-5 pb-5">
                <EmptyState title="No job postings yet" description="Create your first posting to start tracking candidates." />
              </div>
            ) : (
              <Table>
                <THead>
                  <TR><TH>Title</TH><TH>Type</TH><TH>Location</TH><TH>Candidates</TH><TH>Status</TH></TR>
                </THead>
                <tbody>
                  {jobs.map((j) => (
                    <TR key={j.id}>
                      <TD className="font-medium">
                        <Link href={`/admin/recruitment/jobs/${j.id}`} className="hover:underline">{j.title}</Link>
                      </TD>
                      <TD><Badge>{j.employmentType}</Badge></TD>
                      <TD>{j.location ?? '—'}</TD>
                      <TD>{j._count.candidates}</TD>
                      <TD><Badge tone={jobTone(j.status)} dot>{j.status}</Badge></TD>
                    </TR>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </div>
        <div>
          <Card>
            <CardHeader title="New job posting" subtitle="Starts as draft. Open to start collecting candidates." />
            <NewJobForm />
          </Card>
        </div>
      </div>
    </div>
  )
}
