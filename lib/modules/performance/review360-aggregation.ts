// Pure aggregation for 360 reviews. Kept DB-free so it's trivially testable
// and reusable by both the queries layer and any export/reporting job.

export type ReviewType = 'self' | 'manager' | 'peer' | 'upward'

export interface Review360Input {
  type: ReviewType
  status: 'pending' | 'submitted'
  rating: number | null
  strengths: string | null
  growthAreas: string | null
}

export interface ReviewTypeBreakdown {
  total: number
  submitted: number
  averageRating: number | null
}

export interface Review360Summary {
  totalReviews: number
  submittedCount: number
  pendingCount: number
  completionRate: number // 0..1
  byType: Record<ReviewType, ReviewTypeBreakdown>
  overallAverageRating: number | null
  othersAverageRating: number | null // excludes self
  selfVsOthersGap: number | null // self - others; positive = self rated higher
  strengths: string[]
  growthAreas: string[]
}

const REVIEW_TYPES: ReviewType[] = ['self', 'manager', 'peer', 'upward']

export function aggregateReview360(reviews: Review360Input[]): Review360Summary {
  const byType: Record<ReviewType, ReviewTypeBreakdown> = {
    self:    { total: 0, submitted: 0, averageRating: null },
    manager: { total: 0, submitted: 0, averageRating: null },
    peer:    { total: 0, submitted: 0, averageRating: null },
    upward:  { total: 0, submitted: 0, averageRating: null },
  }
  const ratingsByType: Record<ReviewType, number[]> = {
    self: [], manager: [], peer: [], upward: [],
  }
  const strengths: string[] = []
  const growthAreas: string[] = []

  for (const r of reviews) {
    if (!REVIEW_TYPES.includes(r.type)) continue
    byType[r.type].total += 1
    if (r.status === 'submitted') {
      byType[r.type].submitted += 1
      if (typeof r.rating === 'number') ratingsByType[r.type].push(r.rating)
      const s = r.strengths?.trim()
      if (s) strengths.push(s)
      const g = r.growthAreas?.trim()
      if (g) growthAreas.push(g)
    }
  }

  for (const t of REVIEW_TYPES) {
    byType[t].averageRating = mean(ratingsByType[t])
  }

  const allSubmitted = ratingsByType.self.concat(ratingsByType.manager, ratingsByType.peer, ratingsByType.upward)
  const othersSubmitted = ratingsByType.manager.concat(ratingsByType.peer, ratingsByType.upward)
  const overall = mean(allSubmitted)
  const others = mean(othersSubmitted)
  const selfAvg = byType.self.averageRating
  const gap = selfAvg !== null && others !== null ? round2(selfAvg - others) : null

  const totalReviews = reviews.length
  const submittedCount = reviews.filter((r) => r.status === 'submitted').length

  return {
    totalReviews,
    submittedCount,
    pendingCount: totalReviews - submittedCount,
    completionRate: totalReviews === 0 ? 0 : round2(submittedCount / totalReviews),
    byType,
    overallAverageRating: overall,
    othersAverageRating: others,
    selfVsOthersGap: gap,
    strengths,
    growthAreas,
  }
}

function mean(xs: number[]): number | null {
  if (xs.length === 0) return null
  return round2(xs.reduce((s, x) => s + x, 0) / xs.length)
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
