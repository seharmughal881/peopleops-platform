import Link from 'next/link'
import { requireUser } from '@/lib/modules/auth'
import { listSurveysFor } from '@/lib/modules/comms'
import { Card, CardHeader } from '@/lib/ui/Card'
import { Badge } from '@/lib/ui/Table'
import { PageHeader } from '@/lib/ui/PageHeader'
import { EmptyState } from '@/lib/ui/EmptyState'

export default async function SurveysPage() {
  const user = await requireUser()
  if (!user.employee) return <Card>No employee record.</Card>

  const surveys = await listSurveysFor(user.employee.id)

  return (
    <div className="space-y-6">
      <PageHeader title="Surveys" description="Share your feedback. Anonymous surveys hide your identity." />

      {surveys.length === 0 ? (
        <EmptyState title="No active surveys" description="When HR opens a survey, you'll see it here." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {surveys.map((s) => (
            <Card key={s.id}>
              <CardHeader
                title={s.title}
                subtitle={s.description ?? undefined}
                action={
                  <div className="flex items-center gap-2">
                    {s.anonymous && <Badge tone="info">anonymous</Badge>}
                    {s.alreadyResponded && <Badge tone="success" dot>responded</Badge>}
                  </div>
                }
              />
              {!s.alreadyResponded ? (
                <Link
                  href={`/surveys/${s.id}`}
                  className="inline-flex items-center justify-center rounded-md bg-accent px-3.5 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover"
                >
                  Take the survey
                </Link>
              ) : (
                <p className="text-sm text-foreground-muted">Thanks for your feedback.</p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
