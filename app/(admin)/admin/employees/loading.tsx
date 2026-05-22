import { Card, CardHeader } from '@/lib/ui/Card'
import { SkeletonTable } from '@/lib/ui/Skeleton'

export default function Loading() {
  return (
    <Card>
      <CardHeader title="Employee directory" subtitle="Loading…" />
      <SkeletonTable rows={10} columns={6} />
    </Card>
  )
}
