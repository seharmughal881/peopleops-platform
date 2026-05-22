/**
 * BullMQ worker process. Runs separately from the Next.js server.
 * Start with: npm run worker
 */
import { Worker } from 'bullmq'
import { JOB_QUEUE, processJob, registerRepeatables, type JobPayload } from '../lib/jobs'
import { getConnection } from '../lib/jobs/queue'
import { createLogger, reportError } from '../lib/observability/logger'

const log = createLogger('worker')

async function main() {
  log.info({ pid: process.pid }, 'worker starting')

  await registerRepeatables()

  const worker = new Worker<JobPayload>(
    JOB_QUEUE,
    async (job) => {
      const jlog = log.child({ jobId: job.id, jobName: job.name })
      const started = Date.now()
      jlog.info({ data: job.data }, 'job start')
      try {
        await processJob(job.data)
        jlog.info({ durationMs: Date.now() - started }, 'job ok')
      } catch (err) {
        reportError(err, {
          scope: 'worker',
          jobId: job.id,
          jobName: job.name,
          jobKind: (job.data as { kind?: string })?.kind,
          attemptsMade: job.attemptsMade,
          durationMs: Date.now() - started,
        })
        throw err
      }
    },
    {
      connection: getConnection(),
      concurrency: 5,
    },
  )

  worker.on('failed', (job, err) => {
    reportError(err, {
      scope: 'worker.failed',
      jobId: job?.id,
      jobName: job?.name,
      attemptsMade: job?.attemptsMade,
    })
  })

  const shutdown = async () => {
    log.info('worker shutting down')
    await worker.close()
    process.exit(0)
  }
  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}

main().catch((err) => {
  reportError(err, { scope: 'worker.fatal' })
  process.exit(1)
})
