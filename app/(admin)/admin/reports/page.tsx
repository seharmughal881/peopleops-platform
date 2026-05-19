import Link from 'next/link'
import { Card, CardHeader, Stat } from '@/lib/ui/Card'
import {
  headcountTotals,
  attendanceInsights,
  leaveSummary,
  attritionThisYear,
  hiringFunnel,
} from '@/lib/modules/reporting'
import { startOfYear } from '@/lib/modules/reporting/_time'
import { ArrowRightIcon } from '@/lib/ui/icons'

type ReportLink = {
  href: string
  title: string
  description: string
  metric: string
  metricHint: string
}

export default async function ReportsOverviewPage() {
  const [hc, attendance, leave, attrition, funnel] = await Promise.all([
    headcountTotals(),
    attendanceInsights(30),
    leaveSummary(),
    attritionThisYear(),
    hiringFunnel(startOfYear()),
  ])

  const links: ReportLink[] = [
    {
      href: '/admin/reports/headcount',
      title: 'Headcount',
      description: 'Active staff by department, tenure, monthly hires vs exits.',
      metric: String(hc.active),
      metricHint: 'active',
    },
    {
      href: '/admin/reports/attrition',
      title: 'Attrition',
      description: 'Separation rate, monthly trend, by department and tenure.',
      metric: `${attrition.rate}%`,
      metricHint: 'YTD rate',
    },
    {
      href: '/admin/reports/diversity',
      title: 'Diversity',
      description: 'Self-disclosed gender, ethnicity, veteran and disability status.',
      metric: '—',
      metricHint: 'k-anon protected',
    },
    {
      href: '/admin/reports/hiring-funnel',
      title: 'Hiring funnel',
      description: 'Applied → screening → interview → offer → hired.',
      metric: String(funnel.totalApplied),
      metricHint: 'applied YTD',
    },
    {
      href: '/admin/reports/attendance',
      title: 'Attendance',
      description: 'Late arrivals, absenteeism, overtime, top offenders.',
      metric: `${attendance.avgDailyHours}h`,
      metricHint: 'avg / day',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Headcount" value={hc.active} hint={`+ ${hc.onLeave} on leave`} />
        <Stat label="Attrition" value={`${attrition.rate}%`} hint="YTD" />
        <Stat label="Leave requests" value={leave.total} hint={`${leave.pending} pending`} />
        <Stat label="Hours logged" value={attendance.totalHours} hint="last 30 days" />
      </div>

      <Card>
        <CardHeader title="Reports" subtitle="Drill into a category for trends and breakdowns." />
        <ul className="divide-y divide-border">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="group flex items-center gap-4 py-3 -mx-1 px-1 rounded-md transition-colors hover:bg-surface-muted"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <h3 className="font-semibold text-foreground">{l.title}</h3>
                    <span className="text-xs text-foreground-subtle">{l.metricHint}</span>
                  </div>
                  <p className="text-sm text-foreground-muted">{l.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-semibold tabular-nums">{l.metric}</p>
                </div>
                <ArrowRightIcon className="size-4 text-foreground-subtle transition-transform group-hover:translate-x-0.5" />
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
