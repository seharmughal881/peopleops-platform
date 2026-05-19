import Link from 'next/link'
import { requireUser } from '@/lib/modules/auth'
import { Card, CardHeader, Stat } from '@/lib/ui/Card'
import { Badge } from '@/lib/ui/Table'
import { myLeaveBalances, myLeaveRequests } from '@/lib/modules/leave'
import { getOpenLog, listMyAttendance } from '@/lib/modules/attendance'
import { listForUser } from '@/lib/modules/notifications'
import { latestAnnouncements } from '@/lib/modules/comms'

export default async function DashboardPage() {
  const user = await requireUser()
  if (!user.employee) {
    return (
      <Card>
        <p>Your user account has no employee record. Please contact HR.</p>
      </Card>
    )
  }

  const [balances, requests, openLog, recentLogs, notifications, announcements] = await Promise.all([
    myLeaveBalances(user.employee.id),
    myLeaveRequests(user.employee.id),
    getOpenLog(user.employee.id),
    listMyAttendance(user.employee.id, { days: 7 }),
    listForUser(user.id, { unreadOnly: true, limit: 5 }),
    latestAnnouncements(3),
  ])

  const totalLeaveLeft = balances.reduce((sum, b) => sum + b.balance, 0)
  const pendingRequests = requests.filter((r) => r.status === 'pending').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome back, {user.employee.firstName}</h1>
        <p className="text-sm text-foreground-muted">Here is your overview.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Leave balance" value={`${totalLeaveLeft} days`} hint="across all leave types" />
        <Stat label="Pending requests" value={pendingRequests} />
        <Stat label="Logs this week" value={recentLogs.length} />
        <Stat label="Clock status" value={openLog ? 'Clocked in' : 'Clocked out'} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Notifications" action={<Link href="/leave" className="text-sm text-accent-deep">View leave</Link>} />
          {notifications.length === 0 && <p className="text-sm text-foreground-muted">No unread notifications.</p>}
          <ul className="space-y-2">
            {notifications.map((n) => (
              <li key={n.id} className="rounded-md border border-border p-3 text-sm">
                <p className="font-medium">{n.title}</p>
                {n.body && <p className="text-foreground-muted">{n.body}</p>}
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Announcements" />
          {announcements.length === 0 && <p className="text-sm text-foreground-muted">No announcements yet.</p>}
          <ul className="space-y-2">
            {announcements.map((a) => (
              <li key={a.id} className="rounded-md border border-border p-3 text-sm">
                <p className="font-medium">{a.title}</p>
                <p className="text-foreground-muted">{a.body}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card>
        <CardHeader title="Leave balances" />
        <div className="flex flex-wrap gap-3">
          {balances.map((b) => (
            <Badge key={b.id} tone="info">
              {b.leaveType}: {b.balance} days
            </Badge>
          ))}
        </div>
      </Card>
    </div>
  )
}
