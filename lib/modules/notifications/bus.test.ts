import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type Listener = (channel: string, message: string) => void

class FakeRedis {
  public published: Array<{ channel: string; message: string }> = []
  public subscribed = new Set<string>()
  public subscribeCalls = 0
  public unsubscribeCalls = 0
  private messageListener?: Listener

  publish(channel: string, message: string) {
    this.published.push({ channel, message })
    // Mirror real Redis: broadcast to any subscriber on the same in-memory bus.
    fakeBus.deliver(channel, message)
    return Promise.resolve(1)
  }

  subscribe(channel: string) {
    this.subscribed.add(channel)
    this.subscribeCalls += 1
    fakeBus.register(channel, (ch, msg) => this.messageListener?.(ch, msg))
    return Promise.resolve()
  }

  unsubscribe(channel: string) {
    this.subscribed.delete(channel)
    this.unsubscribeCalls += 1
    fakeBus.unregister(channel)
    return Promise.resolve()
  }

  on(_event: 'message', listener: Listener) {
    this.messageListener = listener
  }

  duplicate(): FakeRedis {
    return this
  }
}

const fakeBus = {
  routes: new Map<string, (channel: string, message: string) => void>(),
  register(channel: string, fn: (channel: string, message: string) => void) {
    this.routes.set(channel, fn)
  },
  unregister(channel: string) {
    this.routes.delete(channel)
  },
  deliver(channel: string, message: string) {
    this.routes.get(channel)?.(channel, message)
  },
  reset() {
    this.routes.clear()
  },
}

let fakeRedis: FakeRedis

vi.mock('@/lib/jobs/queue', () => ({
  getConnection: () => fakeRedis,
  // Unused exports, kept so any other importers don't blow up.
  enqueue: vi.fn(),
  getQueue: vi.fn(),
  JOB_QUEUE: 'hr-jobs',
}))

// Import lazily so the mock above is wired before module evaluation.
async function loadBus() {
  return import('./bus')
}

describe('notifications bus', () => {
  beforeEach(async () => {
    fakeRedis = new FakeRedis()
    fakeBus.reset()
    const bus = await loadBus()
    bus.__resetBusForTests()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('publishes JSON to the per-user channel', async () => {
    const { publishNotification } = await loadBus()
    await publishNotification('user-1', {
      id: 'n1',
      title: 'hi',
      body: 'world',
      link: null,
      channel: 'inApp',
      createdAt: '2026-05-22T00:00:00.000Z',
    })

    expect(fakeRedis.published).toHaveLength(1)
    expect(fakeRedis.published[0]?.channel).toBe('notif:user-1')
    const parsed = JSON.parse(fakeRedis.published[0]!.message)
    expect(parsed).toMatchObject({ id: 'n1', title: 'hi', body: 'world' })
  })

  it('delivers a published event to a subscriber', async () => {
    const { publishNotification, subscribeNotifications } = await loadBus()
    const received: unknown[] = []

    const unsub = await subscribeNotifications('user-1', (ev) => received.push(ev))
    await publishNotification('user-1', {
      id: 'n1',
      title: 'hello',
      channel: 'inApp',
      createdAt: '2026-05-22T00:00:00.000Z',
    })

    expect(received).toHaveLength(1)
    expect(received[0]).toMatchObject({ id: 'n1', title: 'hello' })

    await unsub()
  })

  it('issues SUBSCRIBE once per channel even with multiple handlers', async () => {
    const { subscribeNotifications, publishNotification } = await loadBus()

    const a: unknown[] = []
    const b: unknown[] = []
    const unsubA = await subscribeNotifications('user-1', (ev) => a.push(ev))
    const unsubB = await subscribeNotifications('user-1', (ev) => b.push(ev))

    expect(fakeRedis.subscribeCalls).toBe(1)
    expect(fakeRedis.subscribed.has('notif:user-1')).toBe(true)

    await publishNotification('user-1', {
      id: 'n1',
      title: 'fanout',
      channel: 'inApp',
      createdAt: '2026-05-22T00:00:00.000Z',
    })

    expect(a).toHaveLength(1)
    expect(b).toHaveLength(1)

    // First unsubscribe must NOT unsubscribe the channel — another handler still wants it.
    await unsubA()
    expect(fakeRedis.unsubscribeCalls).toBe(0)
    expect(fakeRedis.subscribed.has('notif:user-1')).toBe(true)

    await unsubB()
    expect(fakeRedis.unsubscribeCalls).toBe(1)
    expect(fakeRedis.subscribed.has('notif:user-1')).toBe(false)
  })

  it('does not deliver events from a different user channel', async () => {
    const { subscribeNotifications, publishNotification } = await loadBus()
    const received: unknown[] = []

    const unsub = await subscribeNotifications('user-1', (ev) => received.push(ev))
    await publishNotification('user-2', {
      id: 'n1',
      title: 'not for you',
      channel: 'inApp',
      createdAt: '2026-05-22T00:00:00.000Z',
    })

    expect(received).toHaveLength(0)
    await unsub()
  })

  it('ignores malformed JSON without throwing', async () => {
    const { subscribeNotifications } = await loadBus()
    const received: unknown[] = []
    const unsub = await subscribeNotifications('user-1', (ev) => received.push(ev))

    // Deliver garbage directly via the fake bus, bypassing JSON.stringify.
    expect(() => fakeBus.deliver('notif:user-1', 'not-json')).not.toThrow()
    expect(received).toHaveLength(0)
    await unsub()
  })
})
