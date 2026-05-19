/**
 * Integration test prisma client.
 *
 * Side-effect import: the moment this module is loaded, it installs a single
 * PrismaClient onto `globalThis.prisma` BEFORE any production code resolves
 * `@/lib/db/client`. The production client (lib/db/client.ts) reuses the
 * global singleton if present, so production imports of `prisma` see this
 * test-scoped client when tests are running.
 *
 * Integration test files MUST import this module first (or import helpers
 * from it) before importing the modules under test.
 */
import { afterAll, beforeEach } from 'vitest'
import { PrismaClient } from '@prisma/client'

const TEST_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://hr:hr@localhost:5432/hr_dev?schema=test'

type GlobalWithPrisma = typeof globalThis & { prisma?: PrismaClient }
const g = globalThis as GlobalWithPrisma

if (!g.prisma) {
  g.prisma = new PrismaClient({ datasourceUrl: TEST_URL })
}

export const testPrisma: PrismaClient = g.prisma

export async function resetDb() {
  const rows = await testPrisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'test' AND tablename NOT LIKE '\\_prisma%' ESCAPE '\\'
  `
  if (rows.length === 0) return
  const list = rows.map((r) => `"test"."${r.tablename}"`).join(', ')
  await testPrisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`,
  )
}

/**
 * Wires the standard reset-before-each + disconnect-after-suite lifecycle.
 * Call once at the top of each integration test file.
 */
export function useIntegrationDb() {
  beforeEach(async () => {
    await resetDb()
  })
  afterAll(async () => {
    await testPrisma.$disconnect()
  })
}
