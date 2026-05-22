import pino, { type Logger } from 'pino'

// NOTE: do NOT add 'server-only' here — this module is imported by the
// BullMQ worker (plain Node, not Next.js runtime).

const isDev = process.env.NODE_ENV !== 'production'
const level = process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info')

const root: Logger = pino({
  level,
  base: { env: process.env.NODE_ENV ?? 'development' },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      'password',
      'hashedPassword',
      'tempPassword',
      '*.password',
      '*.hashedPassword',
      'authorization',
      '*.authorization',
      'cookie',
      '*.cookie',
      'token',
      '*.token',
    ],
    remove: true,
  },
  ...(isDev && {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'HH:MM:ss.l', ignore: 'pid,hostname' },
    },
  }),
})

export function createLogger(scope: string, extra?: Record<string, unknown>): Logger {
  return root.child({ scope, ...(extra ?? {}) })
}

export const logger = root

export interface ErrorContext {
  scope?: string
  [key: string]: unknown
}

/**
 * Log an error with structured context. Forwards to Sentry if installed
 * AND the SENTRY_DSN env var is set. Always logs via pino.
 *
 * To enable Sentry: `npm install @sentry/nextjs`, set SENTRY_DSN, and
 * configure `instrumentation.ts` to call `Sentry.init({...})`. This helper
 * picks up the global Sentry hub automatically.
 */
export function reportError(err: unknown, ctx: ErrorContext = {}): void {
  const log = ctx.scope ? createLogger(ctx.scope, ctx) : root
  const e = err instanceof Error ? err : new Error(String(err))
  log.error({ err: e, ...ctx }, e.message)

  // Forward to Sentry if available. Avoids a hard dependency.
  const g = globalThis as { Sentry?: { captureException?: (e: unknown, hint?: unknown) => void } }
  if (process.env.SENTRY_DSN && g.Sentry?.captureException) {
    try {
      g.Sentry.captureException(e, { extra: ctx })
    } catch {
      // Don't let the error-reporter throw.
    }
  }
}
