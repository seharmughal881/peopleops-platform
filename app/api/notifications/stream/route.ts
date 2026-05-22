import { readSession } from '@/lib/modules/auth/session'
import { subscribeNotifications, type NotificationEvent } from '@/lib/modules/notifications/bus'

// ioredis isn't compatible with the Edge runtime, and the response must stay
// open indefinitely — both reasons to pin this handler to Node + dynamic.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const HEARTBEAT_MS = 25_000
const encoder = new TextEncoder()

function sseFrame(event: string, data: unknown): Uint8Array {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
}

export async function GET(request: Request) {
  const session = await readSession()
  if (!session?.userId) {
    return new Response('Unauthorized', { status: 401 })
  }
  const userId = session.userId

  let unsubscribe: (() => Promise<void>) | undefined
  let heartbeat: ReturnType<typeof setInterval> | undefined

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const safeEnqueue = (chunk: Uint8Array) => {
        try {
          controller.enqueue(chunk)
        } catch {
          // The stream has been closed by the client — nothing to do.
        }
      }

      safeEnqueue(sseFrame('ready', { userId }))

      unsubscribe = await subscribeNotifications(userId, (event: NotificationEvent) => {
        safeEnqueue(sseFrame('notification', event))
      })

      heartbeat = setInterval(() => {
        // Comments (`:`-prefixed lines) keep proxies from closing the connection
        // without showing up as events on the client.
        safeEnqueue(encoder.encode(`: ping ${Date.now()}\n\n`))
      }, HEARTBEAT_MS)

      const close = async () => {
        if (heartbeat) clearInterval(heartbeat)
        if (unsubscribe) await unsubscribe()
        try {
          controller.close()
        } catch {
          // already closed
        }
      }

      if (request.signal.aborted) {
        await close()
      } else {
        request.signal.addEventListener('abort', () => {
          void close()
        })
      }
    },
    async cancel() {
      if (heartbeat) clearInterval(heartbeat)
      if (unsubscribe) await unsubscribe()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Disable nginx-style proxy buffering so events flush immediately.
      'X-Accel-Buffering': 'no',
    },
  })
}
