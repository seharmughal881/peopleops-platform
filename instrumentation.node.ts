// Node-runtime bootstrap. Only loaded from instrumentation.ts when
// NEXT_RUNTIME === 'nodejs', so Edge static analysis never sees this file.

export async function registerNode() {
  await import('./lib/env')

  const { createLogger } = await import('./lib/observability/logger')
  const log = createLogger('boot')
  log.info({ pid: process.pid }, 'next server starting')

  if (!process.env.SENTRY_DSN) return

  try {
    // turbopackOptional silences the bundler "module not found" warning until
    // the optional peer dep is installed: `npm install @sentry/nextjs`.
    // @ts-expect-error optional peer dependency, not in package.json
    const Sentry = (await import(/* turbopackOptional: true */ '@sentry/nextjs')) as {
      init: (opts: Record<string, unknown>) => void
    }

    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    })
    ;(globalThis as { Sentry?: unknown }).Sentry = Sentry
    log.info('sentry initialized')
  } catch (err) {
    log.warn(
      { err },
      'SENTRY_DSN set but @sentry/nextjs not installed — run: npm install @sentry/nextjs',
    )
  }
}
