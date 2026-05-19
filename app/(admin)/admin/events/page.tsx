import Link from 'next/link'
import { upcomingEvents, pastEvents } from '@/lib/modules/comms'
import { Card, CardHeader } from '@/lib/ui/Card'
import { Badge, Table, THead, TR, TH, TD } from '@/lib/ui/Table'
import { PageHeader } from '@/lib/ui/PageHeader'
import { EmptyState } from '@/lib/ui/EmptyState'
import { NewEventForm } from './NewEventForm'

export default async function AdminEventsPage() {
  const [upcoming, past] = await Promise.all([upcomingEvents(), pastEvents()])

  return (
    <div className="space-y-6">
      <PageHeader title="Events" description="Company events. Employees RSVP from /events." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card padding="none">
            <div className="px-5 pt-5">
              <CardHeader title="Upcoming" subtitle={`${upcoming.length}`} />
            </div>
            {upcoming.length === 0 ? (
              <div className="px-5 pb-5"><EmptyState title="No upcoming events" /></div>
            ) : (
              <Table>
                <THead>
                  <TR><TH>Title</TH><TH>When</TH><TH>Location</TH><TH>Going</TH><TH>Capacity</TH><TH></TH></TR>
                </THead>
                <tbody>
                  {upcoming.map((e) => {
                    const going = e.rsvps.filter((r) => r.status === 'going').length
                    return (
                      <TR key={e.id}>
                        <TD className="font-medium">{e.title}</TD>
                        <TD>{new Date(e.startsAt).toLocaleString()}</TD>
                        <TD>{e.location ?? '—'}</TD>
                        <TD className="tabular-nums">{going}</TD>
                        <TD>{e.capacity ?? '∞'}</TD>
                        <TD>
                          <Link href={`/admin/events/${e.id}`} className="text-accent hover:underline">Open</Link>
                        </TD>
                      </TR>
                    )
                  })}
                </tbody>
              </Table>
            )}
          </Card>

          <Card padding="none">
            <div className="px-5 pt-5">
              <CardHeader title="Past" subtitle={`${past.length}`} />
            </div>
            {past.length === 0 ? (
              <p className="px-5 pb-5 text-sm text-foreground-muted">No past events.</p>
            ) : (
              <Table>
                <THead>
                  <TR><TH>Title</TH><TH>When</TH><TH>Attended</TH></TR>
                </THead>
                <tbody>
                  {past.map((e) => (
                    <TR key={e.id}>
                      <TD className="font-medium">{e.title}</TD>
                      <TD>{new Date(e.startsAt).toLocaleDateString()}</TD>
                      <TD className="tabular-nums">{e.rsvps.filter((r) => r.status === 'going').length}</TD>
                    </TR>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </div>
        <div>
          <Card>
            <CardHeader title="New event" />
            <NewEventForm />
          </Card>
        </div>
      </div>
    </div>
  )
}
