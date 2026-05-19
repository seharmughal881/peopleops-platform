import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getEvent } from '@/lib/modules/comms'
import { Card, CardHeader } from '@/lib/ui/Card'
import { Badge, Table, THead, TR, TH, TD } from '@/lib/ui/Table'
import { PageHeader } from '@/lib/ui/PageHeader'

function tone(s: string) {
  if (s === 'going') return 'success' as const
  if (s === 'maybe') return 'warn' as const
  return 'neutral' as const
}

export default async function AdminEventDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const event = await getEvent(id)
  if (!event) notFound()

  const going = event.rsvps.filter((r) => r.status === 'going')
  const maybe = event.rsvps.filter((r) => r.status === 'maybe')
  const notGoing = event.rsvps.filter((r) => r.status === 'notGoing')

  return (
    <div className="space-y-6">
      <PageHeader
        title={event.title}
        description={`${new Date(event.startsAt).toLocaleString()}${event.location ? ` · ${event.location}` : ''}`}
        breadcrumbs={<Link href="/admin/events" className="hover:underline">← Events</Link>}
        actions={
          <div className="flex gap-2">
            <Badge tone="success">{going.length} going</Badge>
            <Badge tone="warn">{maybe.length} maybe</Badge>
            <Badge>{notGoing.length} not going</Badge>
          </div>
        }
      />

      {event.description && (
        <Card>
          <CardHeader title="Description" />
          <p className="text-sm text-foreground">{event.description}</p>
        </Card>
      )}

      <Card padding="none">
        <div className="px-5 pt-5">
          <CardHeader title="Attendees" subtitle={`${event.rsvps.length} responses`} />
        </div>
        <Table>
          <THead>
            <TR><TH>Employee</TH><TH>Status</TH><TH>Responded</TH></TR>
          </THead>
          <tbody>
            {event.rsvps.length === 0 && <TR><TD>No RSVPs yet.</TD></TR>}
            {event.rsvps.map((r) => (
              <TR key={r.id}>
                <TD>{r.employee.firstName} {r.employee.lastName} ({r.employee.employeeCode})</TD>
                <TD><Badge tone={tone(r.status)} dot>{r.status}</Badge></TD>
                <TD>{new Date(r.respondedAt).toLocaleString()}</TD>
              </TR>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  )
}
