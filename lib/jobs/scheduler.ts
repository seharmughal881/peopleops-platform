import { getQueue, type JobPayload } from './queue'

export interface RepeatableSpec {
  name: string
  payload: JobPayload
  pattern: string // cron expression
}

export const REPEATABLES: RepeatableSpec[] = [
  {
    name: 'documents.expiration-check.daily',
    payload: { kind: 'documents.expiration-check' },
    pattern: '0 7 * * *', // every day 07:00
  },
  {
    name: 'leave.year-end-rollover',
    payload: { kind: 'leave.year-end-rollover' },
    pattern: '0 1 1 1 *', // Jan 1 at 01:00 every year
  },
  {
    name: 'attendance.daily-missed-check',
    payload: { kind: 'attendance.daily-missed-check' },
    pattern: '5 0 * * *', // every day 00:05, reconciles the previous day
  },
  {
    name: 'attendance.late-check-in-sweep',
    payload: { kind: 'attendance.late-check-in-sweep' },
    pattern: '*/5 * * * *', // every 5 minutes; sends a Slack ping to anyone >20 min late
  },
  {
    name: 'attendance.auto-leave-sweep',
    payload: { kind: 'attendance.auto-leave-sweep' },
    pattern: '*/15 * * * *', // every 15 minutes; creates pending sick leave for anyone >3 hr late with no clock-in
  },
]

export async function registerRepeatables() {
  const q = getQueue()
  for (const spec of REPEATABLES) {
    await q.add(spec.name, spec.payload, {
      repeat: { pattern: spec.pattern },
      jobId: spec.name,
      removeOnComplete: { count: 50 },
      removeOnFail: { age: 7 * 86400 },
    })
    console.log(`[scheduler] registered ${spec.name} (${spec.pattern})`)
  }
}
