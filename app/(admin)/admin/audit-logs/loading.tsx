import { Card, CardHeader } from '@/lib/ui/Card'
import { SkeletonTable } from '@/lib/ui/Skeleton'

export default function Loading() {
  return (
    <Card>
      <CardHeader title="Audit logs" subtitle="Loading…" />
      <SkeletonTable rows={10} columns={4} />
    </Card>
  )
}
