import Link from 'next/link'
import { notFound } from 'next/navigation'
import { surveyResults } from '@/lib/modules/comms'
import { Card, CardHeader, Stat } from '@/lib/ui/Card'
import { Badge } from '@/lib/ui/Table'
import { PageHeader } from '@/lib/ui/PageHeader'
import { SurveyStatusButtons } from './SurveyStatusButtons'

function statusTone(s: string) {
  if (s === 'active') return 'success' as const
  if (s === 'closed') return 'neutral' as const
  return 'warn' as const
}

function average(values: Array<string | number>): string {
  const nums = values.map(Number).filter((n) => !isNaN(n))
  if (nums.length === 0) return '—'
  return (nums.reduce((s, v) => s + v, 0) / nums.length).toFixed(2)
}

function distribution(values: Array<string | number>): Map<string, number> {
  const map = new Map<string, number>()
  for (const v of values) {
    const key = String(v)
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  return map
}

export default async function AdminSurveyDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await surveyResults(id)
  if (!data) notFound()
  const { survey, responses, byQuestion } = data

  return (
    <div className="space-y-6">
      <PageHeader
        title={survey.title}
        description={survey.description ?? undefined}
        breadcrumbs={<Link href="/admin/surveys" className="hover:underline">← Surveys</Link>}
        actions={
          <div className="flex items-center gap-2">
            <Badge tone={statusTone(survey.status)} dot>{survey.status}</Badge>
            {survey.anonymous && <Badge tone="info">anonymous</Badge>}
            <SurveyStatusButtons id={survey.id} status={survey.status} />
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Responses" value={responses.length} />
        <Stat label="Questions" value={survey.parsedQuestions.length} />
        <Stat label="Started" value={new Date(survey.createdAt).toLocaleDateString()} />
      </div>

      <div className="space-y-4">
        {byQuestion.map(({ question, values }) => (
          <Card key={question.id}>
            <CardHeader
              title={question.label}
              subtitle={`${values.length} answer${values.length === 1 ? '' : 's'}`}
              action={<Badge>{question.kind}</Badge>}
            />
            {question.kind === 'rating' && (
              <div className="space-y-2">
                <p className="text-sm">
                  <span className="text-foreground-muted">Average:</span>{' '}
                  <span className="font-semibold tabular-nums">{average(values)}</span> / 5
                </p>
                <div className="space-y-1">
                  {[1, 2, 3, 4, 5].map((n) => {
                    const count = values.filter((v) => Number(v) === n).length
                    const pct = values.length ? (count / values.length) * 100 : 0
                    return (
                      <div key={n} className="flex items-center gap-2 text-sm">
                        <span className="w-4 text-right">{n}</span>
                        <div className="h-2 flex-1 overflow-hidden rounded bg-surface-muted">
                          <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-10 text-right tabular-nums text-foreground-muted">{count}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            {question.kind === 'choice' && (
              <div className="space-y-1">
                {Array.from(distribution(values).entries()).map(([option, count]) => {
                  const pct = values.length ? (count / values.length) * 100 : 0
                  return (
                    <div key={option} className="flex items-center gap-2 text-sm">
                      <span className="w-32 truncate">{option}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded bg-surface-muted">
                        <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-10 text-right tabular-nums text-foreground-muted">{count}</span>
                    </div>
                  )
                })}
              </div>
            )}
            {question.kind === 'text' && (
              <ul className="space-y-2 text-sm">
                {values.length === 0 && <li className="text-foreground-muted">No responses yet.</li>}
                {values.map((v, i) => (
                  <li key={i} className="rounded-md bg-surface-muted p-3">{String(v)}</li>
                ))}
              </ul>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
