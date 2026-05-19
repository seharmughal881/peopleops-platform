import 'server-only'
import { prisma } from '@/lib/db/client'
import { monthBucket, monthsBack } from './_time'

const STAGE_ORDER = ['applied', 'screening', 'interview', 'offer', 'hired'] as const
type Stage = (typeof STAGE_ORDER)[number]

// Funnel built from cumulative stage progression: anyone who reached "hired"
// also counted in earlier stages, etc. This gives the classic funnel shape
// even though our schema only stores the candidate's current stage.
export async function hiringFunnel(since: Date) {
  const candidates = await prisma.candidate.findMany({
    where: { appliedAt: { gte: since } },
    select: { stage: true },
  })
  const order = new Map<Stage, number>(STAGE_ORDER.map((s, i) => [s, i]))
  const counts: Record<Stage, number> = {
    applied: 0,
    screening: 0,
    interview: 0,
    offer: 0,
    hired: 0,
  }
  let rejected = 0
  for (const c of candidates) {
    if (c.stage === 'rejected') {
      rejected++
      counts.applied++ // rejected candidates still applied
      continue
    }
    const idx = order.get(c.stage as Stage)
    if (idx === undefined) continue
    for (let i = 0; i <= idx; i++) counts[STAGE_ORDER[i]]++
  }
  const stages = STAGE_ORDER.map((s, i) => {
    const value = counts[s]
    const prev = i > 0 ? counts[STAGE_ORDER[i - 1]] : null
    const conversion = prev && prev > 0 ? Math.round((value / prev) * 100) : null
    return { label: stageLabel(s), value, conversion }
  })
  return { stages, rejected, totalApplied: counts.applied }
}

export async function candidatesBySource(since: Date) {
  const candidates = await prisma.candidate.findMany({
    where: { appliedAt: { gte: since } },
    select: { source: true },
  })
  const counts = new Map<string, number>()
  for (const c of candidates) {
    const src = c.source ?? 'unknown'
    counts.set(src, (counts.get(src) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([source, value]) => ({ label: sourceLabel(source), value }))
    .sort((a, b) => b.value - a.value)
}

export async function applicationsMonthlyTrend(months = 6) {
  const start = monthsBack(months - 1)
  const buckets = monthBucket(start, new Date())
  const candidates = await prisma.candidate.findMany({
    where: { appliedAt: { gte: start } },
    select: { appliedAt: true },
  })
  const byKey = new Map<string, number>()
  for (const c of candidates) {
    const k = `${c.appliedAt.getFullYear()}-${String(c.appliedAt.getMonth() + 1).padStart(2, '0')}`
    byKey.set(k, (byKey.get(k) ?? 0) + 1)
  }
  return buckets.map((b) => ({ label: b.short, value: byKey.get(b.key) ?? 0 }))
}

// Average days from candidate.appliedAt to offer.decidedAt (accepted).
// Returns null when there's no signal yet.
export async function timeToHire(since: Date) {
  const hires = await prisma.candidate.findMany({
    where: { stage: 'hired', appliedAt: { gte: since } },
    select: { appliedAt: true, offer: { select: { decidedAt: true } } },
  })
  const durations = hires
    .map((h) => h.offer?.decidedAt && (h.offer.decidedAt.getTime() - h.appliedAt.getTime()) / 86400000)
    .filter((d): d is number => typeof d === 'number' && d >= 0)
  if (durations.length === 0) return { avg: null as number | null, count: 0 }
  const avg = durations.reduce((s, d) => s + d, 0) / durations.length
  return { avg: Math.round(avg * 10) / 10, count: durations.length }
}

export async function openJobsSummary() {
  const [open, draft, closed, filled] = await Promise.all([
    prisma.jobPosting.count({ where: { status: 'open' } }),
    prisma.jobPosting.count({ where: { status: 'draft' } }),
    prisma.jobPosting.count({ where: { status: 'closed' } }),
    prisma.jobPosting.count({ where: { status: 'filled' } }),
  ])
  return { open, draft, closed, filled }
}

function stageLabel(s: Stage): string {
  const map: Record<Stage, string> = {
    applied: 'Applied',
    screening: 'Screening',
    interview: 'Interview',
    offer: 'Offer',
    hired: 'Hired',
  }
  return map[s]
}

function sourceLabel(s: string): string {
  if (s === 'linkedIn') return 'LinkedIn'
  if (s === 'referral') return 'Referral'
  if (s === 'direct') return 'Direct'
  if (s === 'other') return 'Other'
  if (s === 'unknown') return 'Unknown'
  return s
}
