import { Queue, type ConnectionOptions } from 'bullmq'
import IORedis from 'ioredis'

export const JOB_QUEUE = 'hr-jobs' as const

let redis: IORedis | undefined
let queue: Queue<JobPayload> | undefined

function connection(): ConnectionOptions {
  if (!redis) {
    const url = process.env.REDIS_URL ?? 'redis://localhost:6379'
    redis = new IORedis(url, { maxRetriesPerRequest: null })
  }
  return redis
}

export type JobPayload =
  | { kind: 'notification.email'; userId: string; subject: string; body: string; html?: string }
  | { kind: 'notification.slack'; userId: string; title: string; body?: string }
  | { kind: 'notification.teams'; userId: string; title: string; body?: string }
  | { kind: 'announcement.slack-broadcast'; announcementId: string }
  | { kind: 'announcement.teams-broadcast'; announcementId: string }
  | { kind: 'documents.expiration-check' }
  | { kind: 'leave.approval-reminder'; approvalId: string }
  | { kind: 'leave.year-end-rollover'; year?: number }
  | { kind: 'attendance.daily-missed-check'; date?: string }

export function getQueue(): Queue<JobPayload> {
  if (!queue) queue = new Queue<JobPayload>(JOB_QUEUE, { connection: connection() })
  return queue
}

export async function enqueue(payload: JobPayload, opts: { delay?: number } = {}) {
  return getQueue().add(payload.kind, payload, {
    delay: opts.delay,
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { age: 86400, count: 1000 },
    removeOnFail: { age: 7 * 86400 },
  })
}

export function getConnection(): ConnectionOptions {
  return connection()
}
