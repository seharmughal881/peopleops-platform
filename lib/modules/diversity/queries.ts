import 'server-only'
import { prisma } from '@/lib/db/client'
import {
  GENDER_OPTIONS,
  ETHNICITY_OPTIONS,
  VETERAN_OPTIONS,
  DISABILITY_OPTIONS,
  K_ANONYMITY_THRESHOLD,
} from './schemas'

export async function getMyDiversity(employeeId: string) {
  return prisma.employeeDiversity.findUnique({ where: { employeeId } })
}

type Field = 'gender' | 'ethnicity' | 'veteranStatus' | 'disabilityStatus'

type Bucket = { value: string; label: string; count: number; suppressed: boolean }

function labelFor(field: Field, value: string): string {
  const list =
    field === 'gender' ? GENDER_OPTIONS
    : field === 'ethnicity' ? ETHNICITY_OPTIONS
    : field === 'veteranStatus' ? VETERAN_OPTIONS
    : DISABILITY_OPTIONS
  return list.find((o) => o.value === value)?.label ?? value
}

// Counts disclosures per bucket and suppresses small buckets (k-anonymity)
// to prevent re-identification of small groups.
async function bucketize(field: Field): Promise<{
  buckets: Bucket[]
  notDisclosed: number
  totalActive: number
  threshold: number
}> {
  const rows = await prisma.employee.findMany({
    where: { status: 'active' },
    select: { diversity: { select: { [field]: true } as Record<string, true> } },
  })
  const totalActive = rows.length
  const counts = new Map<string, number>()
  let notDisclosed = 0
  for (const r of rows) {
    const v = (r.diversity as Record<string, string | null> | null)?.[field]
    if (!v) notDisclosed++
    else counts.set(v, (counts.get(v) ?? 0) + 1)
  }
  const buckets: Bucket[] = [...counts.entries()].map(([value, count]) => ({
    value,
    label: labelFor(field, value),
    count,
    suppressed: count < K_ANONYMITY_THRESHOLD,
  }))
  buckets.sort((a, b) => b.count - a.count)
  return { buckets, notDisclosed, totalActive, threshold: K_ANONYMITY_THRESHOLD }
}

export async function diversityBreakdown() {
  const [gender, ethnicity, veteran, disability] = await Promise.all([
    bucketize('gender'),
    bucketize('ethnicity'),
    bucketize('veteranStatus'),
    bucketize('disabilityStatus'),
  ])
  return { gender, ethnicity, veteran, disability }
}
