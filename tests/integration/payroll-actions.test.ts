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

import { createPayslipRun } from '@/lib/modules/payroll/actions'

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
    permissions: ['payroll:create'],
  })
})

describe('createPayslipRun — date validation', () => {
  it('rejects empty periodStart/periodEnd', async () => {
    const result = await createPayslipRun(fd({ periodStart: '', periodEnd: '' }))
    expect(result).toMatchObject({ error: 'Validation failed' })
    expect(await testPrisma.payslipRun.count()).toBe(0)
  })

  it('rejects garbage date strings', async () => {
    const result = await createPayslipRun(fd({ periodStart: 'not-a-date', periodEnd: 'also-not' }))
    expect(result).toMatchObject({ error: 'Validation failed' })
    expect(await testPrisma.payslipRun.count()).toBe(0)
  })

  it('rejects when periodEnd is before periodStart', async () => {
    const result = await createPayslipRun(
      fd({ periodStart: '2026-02-01', periodEnd: '2026-01-31' }),
    )
    expect(result).toMatchObject({ error: 'Validation failed' })
    expect((result as { fieldErrors?: Record<string, string[]> }).fieldErrors?.periodEnd).toBeDefined()
    expect(await testPrisma.payslipRun.count()).toBe(0)
  })

  it('rejects when periodEnd equals periodStart (zero-length period)', async () => {
    const result = await createPayslipRun(
      fd({ periodStart: '2026-01-01', periodEnd: '2026-01-01' }),
    )
    expect(result).toMatchObject({ error: 'Validation failed' })
    expect(await testPrisma.payslipRun.count()).toBe(0)
  })

  it('accepts valid dates and creates the run', async () => {
    const result = await createPayslipRun(
      fd({ periodStart: '2026-01-01', periodEnd: '2026-01-31' }),
    )
    expect(result).toMatchObject({ ok: true })
    const runs = await testPrisma.payslipRun.findMany()
    expect(runs).toHaveLength(1)
    expect(runs[0].periodStart.toISOString().startsWith('2026-01-01')).toBe(true)
    expect(runs[0].periodEnd.toISOString().startsWith('2026-01-31')).toBe(true)
  })

  it('generates payslips for each active employee with their currency from salary history', async () => {
    const user1 = await testPrisma.user.create({
      data: { email: 'e1@x.com', hashedPassword: 'x' },
    })
    const emp1 = await testPrisma.employee.create({
      data: {
        userId: user1.id,
        employeeCode: 'E1',
        firstName: 'A',
        lastName: 'A',
        joinDate: new Date('2024-01-01'),
        status: 'active',
      },
    })
    await testPrisma.salaryHistory.create({
      data: {
        employeeId: emp1.id,
        amount: 5000,
        currency: 'USD',
        effectiveDate: new Date('2024-01-01'),
      },
    })

    const user2 = await testPrisma.user.create({
      data: { email: 'e2@x.com', hashedPassword: 'x' },
    })
    const emp2 = await testPrisma.employee.create({
      data: {
        userId: user2.id,
        employeeCode: 'E2',
        firstName: 'B',
        lastName: 'B',
        joinDate: new Date('2024-01-01'),
        status: 'inactive',
      },
    })
    await testPrisma.salaryHistory.create({
      data: {
        employeeId: emp2.id,
        amount: 9000,
        currency: 'USD',
        effectiveDate: new Date('2024-01-01'),
      },
    })

    const result = await createPayslipRun(
      fd({ periodStart: '2026-03-01', periodEnd: '2026-03-31' }),
    )
    expect(result).toMatchObject({ ok: true })

    const slips = await testPrisma.payslip.findMany()
    // Only active employee gets a slip
    expect(slips).toHaveLength(1)
    expect(slips[0].employeeId).toBe(emp1.id)
    expect(slips[0].grossPay).toBe(5000)
    expect(slips[0].currency).toBe('USD')
  })
})
