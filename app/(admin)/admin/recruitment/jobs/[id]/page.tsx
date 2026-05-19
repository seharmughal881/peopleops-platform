import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getJob } from '@/lib/modules/recruitment'
import { Card, CardHeader } from '@/lib/ui/Card'
import { Badge, Table, THead, TR, TH, TD } from '@/lib/ui/Table'
import { PageHeader } from '@/lib/ui/PageHeader'
import { EmptyState } from '@/lib/ui/EmptyState'
import { AddCandidateForm } from './AddCandidateForm'
import { JobStatusButtons } from './JobStatusButtons'

function stageTone(s: string) {
  if (s === 'hired') return 'success' as const
  if (s === 'offer') return 'info' as const
  if (s === 'rejected') return 'danger' as const
  if (s === 'interview') return 'warn' as const
  return 'neutral' as const
}

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const job = await getJob(id)
  if (!job) notFound()

  return (
    <div className="space-y-6">
      <PageHeader
        title={job.title}
        description={`${job.employmentType} · ${job.location ?? 'no location'} · created by ${job.createdBy.firstName} ${job.createdBy.lastName}`}
        breadcrumbs={
          <Link href="/admin/recruitment" className="hover:underline">← Recruitment</Link>
        }
        actions={<JobStatusButtons id={job.id} status={job.status} />}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader title="Description" />
            <p className="whitespace-pre-wrap text-sm text-foreground">{job.description}</p>
          </Card>

          <Card padding="none">
            <div className="px-5 pt-5">
              <CardHeader title="Candidates" subtitle={`${job.candidates.length} in pipeline`} />
            </div>
            {job.candidates.length === 0 ? (
              <div className="px-5 pb-5">
                <EmptyState title="No candidates yet" description="Add the first applicant to start the pipeline." />
              </div>
            ) : (
              <Table>
                <THead>
                  <TR><TH>Name</TH><TH>Email</TH><TH>Source</TH><TH>Stage</TH><TH>Interviews</TH><TH>Offer</TH><TH></TH></TR>
                </THead>
                <tbody>
                  {job.candidates.map((c) => (
                    <TR key={c.id}>
                      <TD className="font-medium">{c.firstName} {c.lastName}</TD>
                      <TD>{c.email}</TD>
                      <TD>{c.source ?? '—'}</TD>
                      <TD><Badge tone={stageTone(c.stage)} dot>{c.stage}</Badge></TD>
                      <TD>{c._count.interviews}</TD>
                      <TD>{c.offer ? <Badge tone="info">{c.offer.status}</Badge> : '—'}</TD>
                      <TD>
                        <Link href={`/admin/recruitment/candidates/${c.id}`} className="text-accent hover:underline">Open</Link>
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
            <CardHeader title="Add candidate" subtitle="Resume upload optional (PDF/DOCX, 10 MB max)" />
            <AddCandidateForm jobPostingId={job.id} />
          </Card>
        </div>
      </div>
    </div>
  )
}
