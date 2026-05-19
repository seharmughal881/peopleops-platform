import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { requireUser } from '@/lib/modules/auth'
import { getSurvey } from '@/lib/modules/comms'
import { Card, CardHeader } from '@/lib/ui/Card'
import { Badge } from '@/lib/ui/Table'
import { PageHeader } from '@/lib/ui/PageHeader'
import { SurveyForm } from './SurveyForm'

export default async function TakeSurveyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireUser()
  if (!user.employee) redirect('/dashboard')

  const survey = await getSurvey(id)
  if (!survey) notFound()
  if (survey.status !== 'active') redirect('/surveys')

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title={survey.title}
        description={survey.description ?? undefined}
        breadcrumbs={<Link href="/surveys" className="hover:underline">← Surveys</Link>}
        actions={survey.anonymous ? <Badge tone="info">anonymous</Badge> : null}
      />
      <Card>
        <CardHeader title="Your response" subtitle={survey.anonymous ? 'Your identity is not recorded.' : 'Your name will be attached.'} />
        <SurveyForm surveyId={survey.id} questions={survey.parsedQuestions} />
      </Card>
    </div>
  )
}
