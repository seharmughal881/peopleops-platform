import { describe, it, expect } from 'vitest'
import { aggregateReview360, type Review360Input } from './review360-aggregation'

const r = (
  type: Review360Input['type'],
  status: Review360Input['status'],
  rating: number | null = null,
  strengths: string | null = null,
  growthAreas: string | null = null,
): Review360Input => ({ type, status, rating, strengths, growthAreas })

describe('aggregateReview360', () => {
  it('returns zeroed summary for an empty input', () => {
    const s = aggregateReview360([])
    expect(s.totalReviews).toBe(0)
    expect(s.submittedCount).toBe(0)
    expect(s.completionRate).toBe(0)
    expect(s.overallAverageRating).toBeNull()
    expect(s.othersAverageRating).toBeNull()
    expect(s.selfVsOthersGap).toBeNull()
    expect(s.byType.self).toEqual({ total: 0, submitted: 0, averageRating: null })
    expect(s.strengths).toEqual([])
    expect(s.growthAreas).toEqual([])
  })

  it('counts pending vs submitted and computes completion rate', () => {
    const s = aggregateReview360([
      r('self', 'pending'),
      r('manager', 'submitted', 4),
      r('peer', 'submitted', 3),
      r('peer', 'pending'),
    ])
    expect(s.totalReviews).toBe(4)
    expect(s.submittedCount).toBe(2)
    expect(s.pendingCount).toBe(2)
    expect(s.completionRate).toBe(0.5)
  })

  it('computes per-type averages from submitted ratings only', () => {
    const s = aggregateReview360([
      r('peer', 'submitted', 4),
      r('peer', 'submitted', 2),
      r('peer', 'pending', 5), // ignored
      r('manager', 'submitted', 5),
    ])
    expect(s.byType.peer.total).toBe(3)
    expect(s.byType.peer.submitted).toBe(2)
    expect(s.byType.peer.averageRating).toBe(3) // (4+2)/2
    expect(s.byType.manager.averageRating).toBe(5)
    expect(s.byType.self.averageRating).toBeNull()
  })

  it('computes self-vs-others gap (positive = self rated higher)', () => {
    const s = aggregateReview360([
      r('self', 'submitted', 5),
      r('manager', 'submitted', 3),
      r('peer', 'submitted', 3),
      r('peer', 'submitted', 4),
    ])
    // others avg = (3+3+4)/3 = 3.33
    expect(s.othersAverageRating).toBe(3.33)
    expect(s.selfVsOthersGap).toBe(1.67)
  })

  it('returns null gap when self or others are missing submitted ratings', () => {
    const onlySelf = aggregateReview360([r('self', 'submitted', 4)])
    expect(onlySelf.othersAverageRating).toBeNull()
    expect(onlySelf.selfVsOthersGap).toBeNull()

    const onlyOthers = aggregateReview360([r('peer', 'submitted', 4)])
    expect(onlyOthers.byType.self.averageRating).toBeNull()
    expect(onlyOthers.selfVsOthersGap).toBeNull()
  })

  it('collects strengths and growth areas from submitted reviews only', () => {
    const s = aggregateReview360([
      r('manager', 'submitted', 4, 'clear communicator', 'delegate more'),
      r('peer', 'submitted', 3, '  collaborative  ', '   '),
      r('peer', 'pending', null, 'should be ignored', 'should be ignored'),
      r('self', 'submitted', 5, '', null),
    ])
    expect(s.strengths).toEqual(['clear communicator', 'collaborative'])
    expect(s.growthAreas).toEqual(['delegate more'])
  })

  it('ignores reviews with unknown type', () => {
    const s = aggregateReview360([
      // @ts-expect-error — deliberately invalid type
      r('skip-level', 'submitted', 4),
      r('manager', 'submitted', 5),
    ])
    expect(s.byType.manager.submitted).toBe(1)
    expect(s.submittedCount).toBe(2) // totals still count input rows
  })
})
