import { execSync } from 'node:child_process'

const TEST_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://hr:hr@localhost:5432/hr_dev?schema=test'

export async function setup() {
  try {
    execSync('npx prisma db push --skip-generate --accept-data-loss', {
      env: { ...process.env, DATABASE_URL: TEST_URL },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  } catch (err) {
    const msg = (err as { stderr?: Buffer; stdout?: Buffer }).stderr?.toString()
      ?? (err as { stdout?: Buffer }).stdout?.toString()
      ?? String(err)
    console.error(
      '\n[integration tests] Failed to apply schema to test database.\n' +
        `Connection: ${TEST_URL}\n` +
        'Make sure Postgres is running: npm run services:up\n\n' +
        msg,
    )
    throw err
  }
}
