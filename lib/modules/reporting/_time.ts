import 'server-only'

const SHORT_MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function monthsBack(n: number): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(1)
  d.setMonth(d.getMonth() - n)
  return d
}

export function monthBucket(start: Date, end: Date): Array<{ key: string; short: string; date: Date }> {
  const out: Array<{ key: string; short: string; date: Date }> = []
  const d = new Date(start.getFullYear(), start.getMonth(), 1)
  while (d <= end) {
    out.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      short: SHORT_MONTH[d.getMonth()],
      date: new Date(d),
    })
    d.setMonth(d.getMonth() + 1)
  }
  return out
}

export function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86400000)
}

export function startOfYear(): Date {
  return new Date(new Date().getFullYear(), 0, 1)
}
