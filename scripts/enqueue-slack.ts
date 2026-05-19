import { enqueue } from '../lib/jobs/queue'
import { prisma } from '../lib/db/client'
async function main() {
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@example.com' } })
  await enqueue({ kind: 'notification.slack', userId: admin.id, title: 'Slack smoke test', body: 'hello' })
  await prisma.$disconnect()
}
main().then(() => process.exit(0))
