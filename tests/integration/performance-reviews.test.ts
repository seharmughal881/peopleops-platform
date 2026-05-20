import { beforeEach, describe, expect, it, vi } from 'vitest'
import { testPrisma, useIntegrationDb } from './db'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

const authMock = vi.hoisted(() => ({
  requireUser: vi.fn(),
  requirePermission: vi.fn(),
}))

vi.mock('@/lib/modules/auth', () => authMock)

import { setCycleStatus, createCycle } from '@/lib/modules/performance/reviews'

useIntegrationDb()

function fd(entries: Record<string, string>) {
  const f = new FormData()
  for (const [k, v] of Object.entries(entries)) f.append(k, v)
  return f
}

beforeEach(() => {
  authMock.requireUser.mockReset()
  authMock.requirePermission.mockReset()
  authMock.requirePermission.mockResolvedValue({
    id: 'admin-user',
    email: 'admin@x.com',
    employee: null,
    roles: ['hr_admin'],
    permissions: ['employee:read'],
  })
})

async function seedCycle(status: 'draft' | 'active' | 'closed', name = 'Q1 2026') {
  return testPrisma.reviewCycle.create({
    data: {
      name,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-03-31'),
      status,
    },
  })
}

describe('setCycleStatus — state machine', () => {
  it('allows draft → active', async () => {
    const cycle = await seedCycle('draft')
    const result = await setCycleStatus(fd({ id: cycle.id, status: 'active' }))
    expect(result).toMatchObject({ ok: true })
    const reloaded = await testPrisma.reviewCycle.findUniqueOrThrow({ where: { id: cycle.id } })
    expect(reloaded.status).toBe('active')
  })

  it('allows active → closed', async () => {
    const cycle = await seedCycle('active')
    const result = await setCycleStatus(fd({ id: cycle.id, status: 'closed' }))
    expect(result).toMatchObject({ ok: true })
    const reloaded = await testPrisma.reviewCycle.findUniqueOrThrow({ where: { id: cycle.id } })
    expect(reloaded.status).toBe('closed')
  })

  it('rejects draft → closed (must go via active first)', async () => {
    const cycle = await seedCycle('draft')
    const result = await setCycleStatus(fd({ id: cycle.id, status: 'closed' }))
    expect(result).toMatchObject({ error: expect.stringContaining('Cannot transition') })
    const reloaded = await testPrisma.reviewCycle.findUniqueOrThrow({ where: { id: cycle.id } })
    expect(reloaded.status).toBe('draft')
  })

  it('rejects active → draft (cannot un-activate)', async () => {
    const cycle = await seedCycle('active')
    const result = await setCycleStatus(fd({ id: cycle.id, status: 'draft' }))
    expect(result).toMatchObject({ error: expect.stringContaining('Cannot transition') })
    const reloaded = await testPrisma.reviewCycle.findUniqueOrThrow({ where: { id: cycle.id } })
    expect(reloaded.status).toBe('active')
  })

  it('rejects closed → active (closed is terminal — prevents orphan reviews)', async () => {
    const cycle = await seedCycle('closed')
    const result = await setCycleStatus(fd({ id: cycle.id, status: 'active' }))
    expect(result).toMatchObject({ error: expect.stringContaining('Cannot transition') })
    const reloaded = await testPrisma.reviewCycle.findUniqueOrThrow({ where: { id: cycle.id } })
    expect(reloaded.status).toBe('closed')
  })

  it('rejects closed → draft', async () => {
    const cycle = await seedCycle('closed')
    const result = await setCycleStatus(fd({ id: cycle.id, status: 'draft' }))
    expect(result).toMatchObject({ error: expect.stringContaining('Cannot transition') })
  })

  it('is a no-op when target status equals current status', async () => {
    const cycle = await seedCycle('active')
    const result = await setCycleStatus(fd({ id: cycle.id, status: 'active' }))
    expect(result).toMatchObject({ ok: true })
  })

  it('rejects an unknown status string', async () => {
    const cycle = await seedCycle('draft')
    const result = await setCycleStatus(fd({ id: cycle.id, status: 'archived' }))
    expect(result).toMatchObject({ error: 'Invalid status' })
  })

  it('rejects a missing id', async () => {
    const result = await setCycleStatus(fd({ id: '', status: 'active' }))
    expect(result).toMatchObject({ error: 'Missing id' })
  })

  it('rejects when the cycle does not exist', async () => {
    const result = await setCycleStatus(fd({ id: 'nonexistent', status: 'active' }))
    expect(result).toMatchObject({ error: 'Cycle not found' })
  })
})

describe('createCycle', () => {
  it('creates a draft cycle with valid dates', async () => {
    const result = await createCycle(
      fd({ name: 'Test Cycle', startDate: '2026-01-01', endDate: '2026-03-31' }),
    )
    expect(result).toMatchObject({ ok: true })
    const cycles = await testPrisma.reviewCycle.findMany()
    expect(cycles).toHaveLength(1)
    expect(cycles[0].status).toBe('draft')
  })

  it('returns a friendly error on duplicate name', async () => {
    await seedCycle('draft', 'Dup Name')
    const result = await createCycle(
      fd({ name: 'Dup Name', startDate: '2026-04-01', endDate: '2026-06-30' }),
    )
    expect(result).toMatchObject({ error: expect.stringContaining('already exists') })
  })

  it('rejects missing name', async () => {
    const result = await createCycle(
      fd({ name: '', startDate: '2026-01-01', endDate: '2026-03-31' }),
    )
    expect(result).toMatchObject({ error: 'Validation failed' })
  })
})
