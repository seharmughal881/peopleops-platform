import { getConnection } from '@/lib/jobs/queue'

export interface NotificationEvent {
  id: string
  title: string
  body?: string | null
  link?: string | null
  channel: string
  createdAt: string
}

// Minimal pub/sub surface — kept small so the bus can be unit-tested with a
// hand-rolled fake. The real ioredis client satisfies this shape.
interface RedisPubSub {
  publish(channel: string, message: string): Promise<number> | number
  subscribe(...channels: string[]): Promise<unknown> | unknown
  unsubscribe(...channels: string[]): Promise<unknown> | unknown
  on(event: 'message', listener: (channel: string, message: string) => void): void
  duplicate(): RedisPubSub
}

function channelFor(userId: string) {
  return `notif:${userId}`
}

let subscriber: RedisPubSub | undefined
const handlers = new Map<string, Set<(event: NotificationEvent) => void>>()

function asPubSub(value: unknown): RedisPubSub | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Partial<RedisPubSub>
  if (typeof v.publish !== 'function') return null
  if (typeof v.subscribe !== 'function') return null
  if (typeof v.duplicate !== 'function') return null
  return value as RedisPubSub
}

function getSubscriber(): RedisPubSub | null {
  if (subscriber) return subscriber
  const base = asPubSub(getConnection())
  if (!base) return null
  // Pub/sub clients enter subscribe mode and cannot issue normal commands, so
  // we duplicate the existing connection rather than reusing it.
  subscriber = base.duplicate()
  subscriber.on('message', (channel: string, raw: string) => {
    const set = handlers.get(channel)
    if (!set || set.size === 0) return
    try {
      const event = JSON.parse(raw) as NotificationEvent
      for (const fn of set) fn(event)
    } catch {
      // Ignore malformed payloads — a producer schema mismatch shouldn't kill the stream.
    }
  })
  return subscriber
}

export async function publishNotification(userId: string, event: NotificationEvent): Promise<void> {
  const base = asPubSub(getConnection())
  if (!base) return
  await base.publish(channelFor(userId), JSON.stringify(event))
}

// Test-only: reset module-level state between cases.
export function __resetBusForTests() {
  subscriber = undefined
  handlers.clear()
}

export async function subscribeNotifications(
  userId: string,
  handler: (event: NotificationEvent) => void
): Promise<() => Promise<void>> {
  const channel = channelFor(userId)
  const sub = getSubscriber()
  let set = handlers.get(channel)
  if (!set) {
    set = new Set()
    handlers.set(channel, set)
    if (sub) await sub.subscribe(channel)
  }
  set.add(handler)

  return async () => {
    const current = handlers.get(channel)
    if (!current) return
    current.delete(handler)
    if (current.size === 0) {
      handlers.delete(channel)
      if (sub) {
        try {
          await sub.unsubscribe(channel)
        } catch {
          // Ignore — the subscriber may have already been torn down on shutdown.
        }
      }
    }
  }
}
