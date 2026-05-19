import { enqueue } from '../lib/jobs/queue'
import { prisma } from '../lib/db/client'

async function main() {
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@example.com' } })
  const job = await enqueue({
    kind: 'notification.email',
    userId: admin.id,
    subject: 'Smoke test',
    body: 'If you see this in worker logs, the queue works end-to-end.',
  })
  console.log('Enqueued job id:', job.id)
  await prisma.$disconnect()
  process.exit(0)
}
main()
