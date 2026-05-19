import Link from 'next/link'
import { Card, CardHeader, Stat } from '@/lib/ui/Card'
import { Donut } from '@/lib/ui/Chart'
import { diversityBreakdown, K_ANONYMITY_THRESHOLD } from '@/lib/modules/diversity'
import { ArrowLeftIcon } from '@/lib/ui/icons'

type Bucket = { value: string; label: string; count: number; suppressed: boolean }
type Section = { buckets: Bucket[]; notDisclosed: number; totalActive: number; threshold: number }

function DiversityCard({ title, data }: { title: string; data: Section }) {
  const disclosed = data.buckets.reduce((s, b) => s + b.count, 0)
  const visible = data.buckets.filter((b) => !b.suppressed)
  const suppressedCount = data.buckets.filter((b) => b.suppressed).length
  return (
    <Card>
      <CardHeader
        title={title}
        subtitle={`${disclosed} of ${data.totalActive} disclosed${suppressedCount > 0 ? ` · ${suppressedCount} small bucket${suppressedCount > 1 ? 's' : ''} hidden` : ''}`}
      />
      {disclosed === 0 ? (
        <p className="text-sm text-foreground-muted">No disclosures yet.</p>
      ) : (
        <Donut
          slices={visible.map((b) => ({ label: b.label, value: b.count }))}
          centerLabel={String(disclosed)}
          centerSub="disclosed"
          size={140}
        />
      )}
      {data.notDisclosed > 0 && (
        <p className="mt-3 border-t border-border pt-2 text-xs text-foreground-muted">
          {data.notDisclosed} employees haven't disclosed.
        </p>
      )}
    </Card>
  )
}

export default async function DiversityReportPage() {
  const diversity = await diversityBreakdown()
  const totalDisclosed = diversity.gender.buckets.reduce((s, b) => s + b.count, 0)
  const totalActive = diversity.gender.totalActive
  const disclosureRate = totalActive > 0 ? Math.round((totalDisclosed / totalActive) * 100) : 0

  return (
    <div className="space-y-6">
      <BackToReports />

      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Diversity & inclusion</h1>
        <p className="text-sm text-foreground-muted">
          Self-disclosed, aggregated. Buckets with fewer than {K_ANONYMITY_THRESHOLD} people are hidden to protect privacy.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Active employees" value={totalActive} />
        <Stat label="Disclosure rate" value={`${disclosureRate}%`} hint={`${totalDisclosed} of ${totalActive}`} />
        <Stat label="Privacy threshold" value={K_ANONYMITY_THRESHOLD} hint="k-anonymity" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DiversityCard title="Gender" data={diversity.gender} />
        <DiversityCard title="Race / ethnicity" data={diversity.ethnicity} />
        <DiversityCard title="Veteran status" data={diversity.veteran} />
        <DiversityCard title="Disability status" data={diversity.disability} />
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
