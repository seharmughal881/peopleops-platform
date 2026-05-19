import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/db/client'
import { requireUser } from '@/lib/modules/auth'
import { Card, CardHeader } from '@/lib/ui/Card'
import { Badge } from '@/lib/ui/Table'
import { SubmitReviewForm } from './SubmitReviewForm'

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireUser()
  if (!user.employee) redirect('/performance')

  const review = await prisma.review.findUnique({
    where: { id },
    include: {
      cycle: true,
      subject: { select: { firstName: true, lastName: true, employeeCode: true } },
    },
  })
  if (!review) notFound()
  if (review.reviewerId !== user.employee.id) redirect('/performance')

  const readOnly = review.status === 'submitted' || review.cycle.status !== 'active'

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card>
        <CardHeader
          title={`${review.cycle.name} — ${review.type} review`}
          subtitle={`Subject: ${review.subject.firstName} ${review.subject.lastName} (${review.subject.employeeCode})`}
          action={<Badge tone={review.status === 'submitted' ? 'success' : 'warn'}>{review.status}</Badge>}
        />
        <SubmitReviewForm
          id={review.id}
          readOnly={readOnly}
          defaults={{
            rating: review.rating ?? 3,
            strengths: review.strengths ?? '',
            growthAreas: review.growthAreas ?? '',
            comments: review.comments ?? '',
          }}
        />
      </Card>
    </div>
  )
}
