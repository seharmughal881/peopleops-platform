/**
 * BullMQ worker process. Runs separately from the Next.js server.
 * Start with: npm run worker
 */
import { Worker } from 'bullmq'
import { JOB_QUEUE, processJob, registerRepeatables, type JobPayload } from '../lib/jobs'
import { getConnection } from '../lib/jobs/queue'

async function main() {
  console.log('[worker] starting…')

  await registerRepeatables()

  const worker = new Worker<JobPayload>(
    JOB_QUEUE,
    async (job) => {
      console.log(`[worker] ${job.name} id=${job.id}`)
      await processJob(job.data)
    },
    {
      connection: getConnection(),
      concurrency: 5,
    }
  )

  worker.on('completed', (job) => console.log(`[worker] ✓ ${job.name} ${job.id}`))
  worker.on('failed', (job, err) => console.error(`[worker] ✗ ${job?.name} ${job?.id}: ${err.message}`))

  const shutdown = async () => {
    console.log('[worker] shutting down…')
    await worker.close()
    process.exit(0)
  }
  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}

main().catch((err) => {
  console.error('[worker] fatal:', err)
  process.exit(1)
})
