import { prisma } from '@/lib/db/client'
import { enqueue } from '@/lib/jobs/queue'

export interface NotifyInput {
  userId: string
  title: string
  body?: string
  link?: string
  channel?: 'inApp' | 'email' | 'slack' | 'teams'
}

export async function notify(input: NotifyInput) {
  const channel = input.channel ?? 'inApp'

  await prisma.notification.create({
    data: {
      userId: input.userId,
      title: input.title,
      body: input.body,
      link: input.link,
      channel,
    },
  })

  if (channel === 'email') {
    await enqueue({
      kind: 'notification.email',
      userId: input.userId,
      subject: input.title,
      body: input.body ?? '',
    })
  } else if (channel === 'slack') {
    await enqueue({
      kind: 'notification.slack',
      userId: input.userId,
      title: input.title,
      body: input.body,
    })
  } else if (channel === 'teams') {
    await enqueue({
      kind: 'notification.teams',
      userId: input.userId,
      title: input.title,
      body: input.body,
    })
  }
}

export async function listForUser(userId: string, opts: { unreadOnly?: boolean; limit?: number } = {}) {
  return prisma.notification.findMany({
    where: { userId, ...(opts.unreadOnly ? { readAt: null } : {}) },
    orderBy: { createdAt: 'desc' },
    take: opts.limit ?? 20,
  })
}

export async function markRead(userId: string, ids: string[]) {
  await prisma.notification.updateMany({
    where: { userId, id: { in: ids } },
    data: { readAt: new Date() },
  })
}
