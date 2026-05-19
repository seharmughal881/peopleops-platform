import { prisma } from '@/lib/db/client'
import { requireUser } from '@/lib/modules/auth'
import { recognitionFeed, recognitionFor } from '@/lib/modules/comms'
import { Card, CardHeader } from '@/lib/ui/Card'
import { Badge } from '@/lib/ui/Table'
import { PageHeader } from '@/lib/ui/PageHeader'
import { EmptyState } from '@/lib/ui/EmptyState'
import { GiveRecognitionForm } from './GiveRecognitionForm'

function tone(c: string) {
  if (c === 'achievement') return 'success' as const
  if (c === 'teamwork') return 'info' as const
  if (c === 'thanks') return 'warn' as const
  return 'neutral' as const
}

export default async function RecognitionPage() {
  const user = await requireUser()
  if (!user.employee) return <Card>No employee record.</Card>

  const [feed, mine, peers] = await Promise.all([
    recognitionFeed(30),
    recognitionFor(user.employee.id),
    prisma.employee.findMany({
      where: { status: 'active', id: { not: user.employee.id } },
      select: { id: true, firstName: true, lastName: true, employeeCode: true },
      orderBy: [{ lastName: 'asc' }],
    }),
  ])

  return (
    <div className="space-y-6">
      <PageHeader title="Recognition" description="Celebrate teammates. Public recognitions appear on the feed." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">Recent recognitions</h2>
          {feed.length === 0 ? (
            <EmptyState title="Nothing yet" description="Be the first to recognize a teammate." />
          ) : (
            <ul className="space-y-3">
              {feed.map((r) => (
                <li key={r.id} className="rounded-lg border border-border bg-surface p-4">
                  <div className="mb-1.5 flex items-center gap-2 text-sm">
                    <span className="font-medium">{r.from.firstName} {r.from.lastName}</span>
                    <span className="text-foreground-muted">recognized</span>
                    <span className="font-medium">{r.to.firstName} {r.to.lastName}</span>
                    <Badge tone={tone(r.category)} dot>{r.category}</Badge>
                  </div>
                  <p className="text-sm text-foreground">{r.message}</p>
                  <p className="mt-2 text-xs text-foreground-subtle">{new Date(r.createdAt).toLocaleString()}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Recognize a teammate" />
            <GiveRecognitionForm peers={peers} />
          </Card>
          <Card>
            <CardHeader title={`Recognitions you've received`} subtitle={`${mine.length} total`} />
            {mine.length === 0 ? (
              <p className="text-sm text-foreground-muted">None yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {mine.slice(0, 5).map((r) => (
                  <li key={r.id} className="rounded-md bg-surface-muted p-2.5">
                    <p className="font-medium">{r.from.firstName} {r.from.lastName} <Badge tone={tone(r.category)}>{r.category}</Badge></p>
                    <p className="text-foreground-muted">{r.message}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
