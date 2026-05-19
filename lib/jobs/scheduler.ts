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
