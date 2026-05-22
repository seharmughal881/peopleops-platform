import { Card, CardHeader } from '@/lib/ui/Card'
import { SkeletonTable } from '@/lib/ui/Skeleton'

export default function Loading() {
  return (
    <Card>
      <CardHeader title="Payroll runs" subtitle="Loading…" />
      <SkeletonTable rows={6} columns={5} />
    </Card>
  )
}
