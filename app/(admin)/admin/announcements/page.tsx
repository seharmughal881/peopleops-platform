import { listAnnouncements } from '@/lib/modules/comms'
import { isSlackConfigured } from '@/lib/modules/integrations/slack'
import { isTeamsConfigured } from '@/lib/modules/integrations/teams'
import { Card, CardHeader } from '@/lib/ui/Card'
import { Table, THead, TR, TH, TD } from '@/lib/ui/Table'
import { NewAnnouncementForm } from './NewAnnouncementForm'
import { DeleteAnnouncementButton } from './DeleteAnnouncementButton'
import { TestSlackButton } from './TestSlackButton'
import { TestTeamsButton } from './TestTeamsButton'

export default async function AnnouncementsPage() {
  const items = await listAnnouncements()

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader title="Announcements" subtitle={`${items.length} published`} />
          <Table>
            <THead>
              <TR><TH>Date</TH><TH>Title</TH><TH>Body</TH><TH></TH></TR>
            </THead>
            <tbody>
              {items.length === 0 && <TR><TD>No announcements yet.</TD></TR>}
              {items.map((a) => (
                <TR key={a.id}>
                  <TD>{new Date(a.publishedAt).toLocaleDateString()}</TD>
                  <TD className="font-medium">{a.title}</TD>
                  <TD><span className="line-clamp-2">{a.body}</span></TD>
                  <TD><DeleteAnnouncementButton id={a.id} /></TD>
                </TR>
              ))}
            </tbody>
          </Table>
        </Card>
      </div>
      <div className="space-y-6">
        <Card>
          <CardHeader title="Publish announcement" />
          <NewAnnouncementForm />
        </Card>
        <Card>
          <CardHeader
            title="Slack integration"
            subtitle={isSlackConfigured() ? 'Webhook configured — new announcements cross-post to Slack.' : 'Set SLACK_WEBHOOK_URL to enable cross-posting.'}
          />
          <TestSlackButton />
        </Card>
        <Card>
          <CardHeader
            title="Microsoft Teams integration"
            subtitle={isTeamsConfigured() ? 'Webhook configured — new announcements cross-post to Teams.' : 'Set TEAMS_WEBHOOK_URL to enable cross-posting.'}
          />
          <TestTeamsButton />
        </Card>
      </div>
    </div>
  )
}
