import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db/client'
import { getCandidate } from '@/lib/modules/recruitment'
import { Card, CardHeader } from '@/lib/ui/Card'
import { Badge, Table, THead, TR, TH, TD } from '@/lib/ui/Table'
import { PageHeader } from '@/lib/ui/PageHeader'
import { EmptyState } from '@/lib/ui/EmptyState'
import { StageButtons } from './StageButtons'
import { ScheduleInterviewForm } from './ScheduleInterviewForm'
import { FeedbackForm } from './FeedbackForm'
import { OfferPanel } from './OfferPanel'

function stageTone(s: string) {
  if (s === 'hired') return 'success' as const
  if (s === 'offer') return 'info' as const
  if (s === 'rejected') return 'danger' as const
  if (s === 'interview') return 'warn' as const
  return 'neutral' as const
}

export default async function CandidateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [candidate, interviewers] = await Promise.all([
    getCandidate(id),
    prisma.employee.findMany({
      where: { status: 'active' },
      select: { id: true, firstName: true, lastName: true },
      orderBy: [{ lastName: 'asc' }],
    }),
  ])
  if (!candidate) notFound()

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${candidate.firstName} ${candidate.lastName}`}
        description={`${candidate.email} · applying for ${candidate.jobPosting.title}`}
        breadcrumbs={
          <>
            <Link href="/admin/recruitment" className="hover:underline">Recruitment</Link>{' › '}
            <Link href={`/admin/recruitment/jobs/${candidate.jobPosting.id}`} className="hover:underline">{candidate.jobPosting.title}</Link>
          </>
        }
        actions={
          <div className="flex items-center gap-2">
            <Badge tone={stageTone(candidate.stage)} dot>{candidate.stage}</Badge>
            {candidate.resumeS3Key && (
              <Link href={`/api/files/${candidate.resumeS3Key}`} target="_blank" className="text-sm text-accent hover:underline">
                Resume
              </Link>
            )}
          </div>
        }
      />

      <Card>
        <CardHeader title="Move stage" />
        <StageButtons id={candidate.id} current={candidate.stage} />
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card padding="none">
            <div className="px-5 pt-5">
              <CardHeader title="Interviews" subtitle={`${candidate.interviews.length} total`} />
            </div>
            {candidate.interviews.length === 0 ? (
              <div className="px-5 pb-5">
                <EmptyState title="No interviews yet" description="Schedule the first one to start gathering feedback." />
              </div>
            ) : (
              <Table>
                <THead>
                  <TR><TH>When</TH><TH>Type</TH><TH>Interviewer</TH><TH>Status</TH><TH>Rating</TH><TH>Recommendation</TH><TH></TH></TR>
                </THead>
                <tbody>
                  {candidate.interviews.map((iv) => (
                    <TR key={iv.id}>
                      <TD>{new Date(iv.scheduledAt).toLocaleString()}</TD>
                      <TD><Badge>{iv.type}</Badge></TD>
                      <TD>{iv.interviewer.firstName} {iv.interviewer.lastName}</TD>
                      <TD><Badge tone={iv.status === 'completed' ? 'success' : 'warn'}>{iv.status}</Badge></TD>
                      <TD>{iv.rating ? `${iv.rating}/5` : '—'}</TD>
                      <TD>
                        {iv.recommendation && (
                          <Badge tone={iv.recommendation === 'hire' ? 'success' : iv.recommendation === 'no_hire' ? 'danger' : 'warn'}>
                            {iv.recommendation}
                          </Badge>
                        )}
                      </TD>
                      <TD>
                        {iv.status === 'scheduled' && <FeedbackForm id={iv.id} />}
                      </TD>
                    </TR>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Schedule interview" />
            <ScheduleInterviewForm candidateId={candidate.id} interviewers={interviewers} />
          </Card>

          <Card>
            <CardHeader title="Offer" />
            <OfferPanel candidateId={candidate.id} offer={candidate.offer} />
          </Card>
        </div>
      </div>
    </div>
  )
}
