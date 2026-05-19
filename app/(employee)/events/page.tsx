import { requireUser } from '@/lib/modules/auth'
import { upcomingEvents } from '@/lib/modules/comms'
import { Card, CardHeader } from '@/lib/ui/Card'
import { Badge } from '@/lib/ui/Table'
import { PageHeader } from '@/lib/ui/PageHeader'
import { EmptyState } from '@/lib/ui/EmptyState'
import { RSVPButtons } from './RSVPButtons'

export default async function EventsPage() {
  const user = await requireUser()
  if (!user.employee) return <Card>No employee record.</Card>

  const events = await upcomingEvents()

  return (
    <div className="space-y-6">
      <PageHeader title="Company events" description="Upcoming events. RSVP to confirm your spot." />

      {events.length === 0 ? (
        <EmptyState title="No upcoming events" description="Check back later." />
      ) : (
        <div className="space-y-4">
          {events.map((e) => {
            const myRSVP = e.rsvps.find((r) => r.employeeId === user.employee!.id)
            const going = e.rsvps.filter((r) => r.status === 'going').length
            const seatsLeft = e.capacity ? e.capacity - going : null
            return (
              <Card key={e.id}>
                <CardHeader
                  title={e.title}
                  subtitle={`${new Date(e.startsAt).toLocaleString()}${e.location ? ` · ${e.location}` : ''}`}
                  action={
                    <div className="flex items-center gap-2">
                      {myRSVP && <Badge tone={myRSVP.status === 'going' ? 'success' : myRSVP.status === 'maybe' ? 'warn' : 'neutral'}>{myRSVP.status}</Badge>}
                      {e.capacity && (
                        <Badge tone={seatsLeft! <= 0 ? 'danger' : seatsLeft! < 5 ? 'warn' : 'neutral'}>
                          {going} / {e.capacity} going
                        </Badge>
                      )}
                    </div>
                  }
                />
                {e.description && <p className="mb-3 text-sm text-foreground">{e.description}</p>}
                <RSVPButtons eventId={e.id} current={myRSVP?.status} />
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
