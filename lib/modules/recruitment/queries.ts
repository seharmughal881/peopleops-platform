import { prisma } from '@/lib/db/client'

export async function listJobs() {
  return prisma.jobPosting.findMany({
    include: {
      _count: { select: { candidates: true } },
      createdBy: { select: { firstName: true, lastName: true } },
    },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  })
}

export async function getJob(id: string) {
  return prisma.jobPosting.findUnique({
    where: { id },
    include: {
      createdBy: { select: { firstName: true, lastName: true } },
      candidates: {
        orderBy: { appliedAt: 'desc' },
        include: { _count: { select: { interviews: true } }, offer: true },
      },
    },
  })
}

export async function getCandidate(id: string) {
  return prisma.candidate.findUnique({
    where: { id },
    include: {
      jobPosting: { select: { id: true, title: true } },
      interviews: {
        orderBy: { scheduledAt: 'desc' },
        include: { interviewer: { select: { firstName: true, lastName: true } } },
      },
      offer: true,
    },
  })
}

export async function listInterviewsForUser(employeeId: string) {
  return prisma.interview.findMany({
    where: { interviewerId: employeeId, status: 'scheduled' },
    include: {
      candidate: { select: { firstName: true, lastName: true, jobPosting: { select: { title: true } } } },
    },
    orderBy: { scheduledAt: 'asc' },
  })
}

export async function recruitmentKPIs() {
  const [jobs, stages, offerStatuses] = await Promise.all([
    prisma.jobPosting.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.candidate.groupBy({ by: ['stage'], _count: { _all: true } }),
    prisma.offer.groupBy({ by: ['status'], _count: { _all: true } }),
  ])
  const jobMap = Object.fromEntries(jobs.map((j) => [j.status, j._count._all]))
  const stageMap = Object.fromEntries(stages.map((s) => [s.stage, s._count._all]))
  const offerMap = Object.fromEntries(offerStatuses.map((o) => [o.status, o._count._all]))
  return {
    openJobs: jobMap.open ?? 0,
    closedJobs: jobMap.closed ?? 0,
    filledJobs: jobMap.filled ?? 0,
    funnel: {
      applied: stageMap.applied ?? 0,
      screening: stageMap.screening ?? 0,
      interview: stageMap.interview ?? 0,
      offer: stageMap.offer ?? 0,
      hired: stageMap.hired ?? 0,
      rejected: stageMap.rejected ?? 0,
    },
    offersSent: offerMap.sent ?? 0,
    offersAccepted: offerMap.accepted ?? 0,
  }
}
