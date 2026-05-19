import Link from 'next/link'
import { Card, CardHeader, Stat } from '@/lib/ui/Card'
import { HBarChart, LineChart, Donut, ChartFrame, ChartLegend } from '@/lib/ui/Chart'
import {
  headcountByDepartment,
  headcountTotals,
  headcountMonthlyFlow,
  tenureDistribution,
} from '@/lib/modules/reporting'
import { ArrowLeftIcon } from '@/lib/ui/icons'

export default async function HeadcountReportPage() {
  const [totals, byDept, flow, tenure] = await Promise.all([
    headcountTotals(),
    headcountByDepartment(),
    headcountMonthlyFlow(12),
    tenureDistribution(),
  ])

  const last12Hires = flow.reduce((s, m) => s + m.hires, 0)
  const last12Exits = flow.reduce((s, m) => s + m.exits, 0)
  const net = last12Hires - last12Exits

  return (
    <div className="space-y-6">
      <BackToReports />

      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Headcount analytics</h1>
        <p className="text-sm text-foreground-muted">Active staff, growth, and tenure shape.</p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Active" value={totals.active} />
        <Stat label="On leave" value={totals.onLeave} />
        <Stat label="Terminated" value={totals.terminated} hint="all-time" />
        <Stat
          label="Net 12mo"
          value={`${net >= 0 ? '+' : ''}${net}`}
          hint={`${last12Hires} hires · ${last12Exits} exits`}
          trend={{ direction: net > 0 ? 'up' : net < 0 ? 'down' : 'flat', label: net > 0 ? 'growing' : net < 0 ? 'shrinking' : 'flat' }}
        />
      </div>

      <Card>
        <CardHeader title="Monthly hires vs exits" subtitle="Last 12 months" />
        <LineChart
          points={flow.map((m) => ({ label: m.label, value: m.hires }))}
          tone="success"
          height={200}
        />
        <div className="mt-2">
          <LineChart
            points={flow.map((m) => ({ label: m.label, value: m.exits }))}
            tone="danger"
            height={120}
          />
        </div>
        <div className="mt-3">
          <ChartLegend items={[{ label: 'Hires', tone: 'success' }, { label: 'Exits', tone: 'danger' }]} />
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="By department" subtitle="Active employees only" />
          <HBarChart data={byDept.map((d) => ({ label: d.department, value: d.count }))} tone="accent" />
        </Card>
        <Card>
          <CardHeader title="Tenure distribution" subtitle="Active employees only" />
          <ChartFrame title="" >
            <Donut slices={tenure.filter((t) => t.value > 0)} centerLabel={String(totals.active)} centerSub="active" />
          </ChartFrame>
        </Card>
      </div>
    </div>
  )
}

function BackToReports() {
  return (
    <Link
      href="/admin/reports"
      className="inline-flex items-center gap-1 text-sm text-foreground-muted hover:text-foreground"
    >
      <ArrowLeftIcon className="size-4" />
      Back to reports
    </Link>
  )
}
