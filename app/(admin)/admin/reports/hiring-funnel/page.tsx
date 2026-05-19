import Link from 'next/link'
import { Card, CardHeader, Stat } from '@/lib/ui/Card'
import { Funnel, HBarChart, LineChart } from '@/lib/ui/Chart'
import {
  hiringFunnel,
  candidatesBySource,
  applicationsMonthlyTrend,
  timeToHire,
  openJobsSummary,
} from '@/lib/modules/reporting'
import { ArrowLeftIcon } from '@/lib/ui/icons'
import { RangeToggle, rangeFrom, type RangeKey } from '../_components/RangeToggle'

export default async function HiringFunnelPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}) {
  const { range: rangeRaw } = await searchParams
  const { since, key, label } = rangeFrom(rangeRaw as RangeKey | undefined)

  const [funnel, sources, monthly, tth, jobs] = await Promise.all([
    hiringFunnel(since),
    candidatesBySource(since),
    applicationsMonthlyTrend(6),
    timeToHire(since),
    openJobsSummary(),
  ])

  const overall =
    funnel.totalApplied > 0
      ? Math.round((funnel.stages[funnel.stages.length - 1].value / funnel.totalApplied) * 1000) / 10
      : 0

  return (
    <div className="space-y-6">
      <BackToReports />

      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Hiring funnel</h1>
          <p className="text-sm text-foreground-muted">Candidate progression from applied to hired.</p>
        </div>
        <RangeToggle basePath="/admin/reports/hiring-funnel" current={key} />
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Applied" value={funnel.totalApplied} hint={label} />
        <Stat label="Hired" value={funnel.stages[funnel.stages.length - 1].value} hint={`${overall}% overall`} />
        <Stat label="Avg time-to-hire" value={tth.avg != null ? `${tth.avg}d` : '—'} hint={tth.count > 0 ? `n=${tth.count}` : 'no hires yet'} />
        <Stat label="Open postings" value={jobs.open} hint={`${jobs.draft} draft · ${jobs.filled} filled`} />
      </div>

      <Card>
        <CardHeader title="Funnel" subtitle={`${label}${funnel.rejected > 0 ? ` · ${funnel.rejected} rejected` : ''}`} />
        <Funnel stages={funnel.stages} />
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="By source" subtitle={label} />
          <HBarChart data={sources} tone="info" emptyLabel="No candidates in this period" />
        </Card>
        <Card>
          <CardHeader title="Applications trend" subtitle="Last 6 months" />
          <LineChart points={monthly} tone="accent" height={200} emptyLabel="No applications yet" />
        </Card>
      </div>
    </div>
  )
}

function BackToReports() {
  return (
    <Link href="/admin/reports" className="inline-flex items-center gap-1 text-sm text-foreground-muted hover:text-foreground">
      <ArrowLeftIcon className="size-4" />
      Back to reports
    </Link>
  )
}
