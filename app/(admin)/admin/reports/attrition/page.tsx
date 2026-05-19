import Link from 'next/link'
import { Card, CardHeader, Stat } from '@/lib/ui/Card'
import { HBarChart, LineChart, Donut } from '@/lib/ui/Chart'
import {
  attritionForWindow,
  attritionMonthlyTrend,
  attritionByDepartment,
  attritionByTenure,
} from '@/lib/modules/reporting'
import { ArrowLeftIcon } from '@/lib/ui/icons'
import { RangeToggle, rangeFrom, type RangeKey } from '../_components/RangeToggle'

export default async function AttritionReportPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}) {
  const { range: rangeRaw } = await searchParams
  const { since, key, label } = rangeFrom(rangeRaw as RangeKey | undefined)

  const [kpis, trend, byDept, byTenure] = await Promise.all([
    attritionForWindow(since),
    attritionMonthlyTrend(12),
    attritionByDepartment(since),
    attritionByTenure(since),
  ])

  return (
    <div className="space-y-6">
      <BackToReports />

      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Attrition</h1>
          <p className="text-sm text-foreground-muted">Separations and resignation trend.</p>
        </div>
        <RangeToggle basePath="/admin/reports/attrition" current={key} />
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Attrition rate" value={`${kpis.rate}%`} hint={label} />
        <Stat label="Separations" value={kpis.separations} hint={label} />
        <Stat label="Avg headcount" value={kpis.avgHeadcount} hint="midpoint estimate" />
        <Stat label="New hires" value={kpis.hiresInWindow} hint={label} />
      </div>

      <Card>
        <CardHeader title="Monthly separations" subtitle="Last 12 months" />
        <LineChart points={trend} tone="danger" height={200} />
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="By department" subtitle={label} />
          <HBarChart
            data={byDept.map((d) => ({ label: d.department, value: d.count }))}
            tone="danger"
            emptyLabel="No separations in this period"
          />
        </Card>
        <Card>
          <CardHeader title="By tenure at exit" subtitle={label} />
          <Donut slices={byTenure.filter((b) => b.value > 0)} centerLabel={String(kpis.separations)} centerSub="exits" />
        </Card>
      </div>

      <p className="text-xs text-foreground-subtle">
        Rate = separations ÷ average headcount over the window. Separations dated by Employee.updatedAt — this is approximate; replace with EmploymentHistory.endDate for audit-grade numbers.
      </p>
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
