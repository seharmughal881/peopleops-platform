import { Card, CardHeader } from '@/lib/ui/Card'
import { Skeleton, SkeletonText } from '@/lib/ui/Skeleton'

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-72" />
        <Skeleton className="h-3 w-56" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <Skeleton className="mb-3 h-3 w-24" />
            <Skeleton className="mb-2 h-8 w-20" />
            <Skeleton className="h-3 w-32" />
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Notifications" subtitle="Loading…" />
          <SkeletonText lines={4} />
        </Card>
        <Card>
          <CardHeader title="Announcements" subtitle="Loading…" />
          <SkeletonText lines={4} />
        </Card>
      </div>

      <Card>
        <CardHeader title="Leave balances" subtitle="Loading…" />
        <div className="flex flex-wrap gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-28" />
          ))}
        </div>
      </Card>
    </div>
  )
}
