import { describe, expect, it } from 'vitest'
import { testPrisma, useIntegrationDb } from './db'
import {
  myPayslips,
  getPayslip,
  listPayslipRuns,
  getPayslipRun,
  payrollDashboard,
  payslipDeductions,
} from '@/lib/modules/payroll/queries'

useIntegrationDb()

async function seedEmployee(opts: { code: string; firstName?: string; lastName?: string; departmentName?: string }) {
  const user = await testPrisma.user.create({
    data: { email: `${opts.code}@x.com`, hashedPassword: 'x' },
  })
  let departmentId: string | undefined
  if (opts.departmentName) {
    const dept = await testPrisma.department.upsert({
      where: { name: opts.departmentName },
      create: { name: opts.departmentName },
      update: {},
    })
    departmentId = dept.id
  }
  return testPrisma.employee.create({
    data: {
      userId: user.id,
      employeeCode: opts.code,
      firstName: opts.firstName ?? 'F',
      lastName: opts.lastName ?? 'L',
      joinDate: new Date('2024-01-01'),
      departmentId,
    },
  })
}

async function seedRun(opts: {
  periodStart: string
  periodEnd: string
  status?: 'draft' | 'finalized'
  payslips?: Array<{ employeeId: string; grossPay: number; netPay: number; deductions?: string; currency?: string }>
}) {
  const run = await testPrisma.payslipRun.create({
    data: {
      periodStart: new Date(opts.periodStart),
      periodEnd: new Date(opts.periodEnd),
      status: opts.status ?? 'draft',
    },
  })
  for (const slip of opts.payslips ?? []) {
    await testPrisma.payslip.create({
      data: {
        payslipRunId: run.id,
        employeeId: slip.employeeId,
        grossPay: slip.grossPay,
        netPay: slip.netPay,
        deductions: slip.deductions ?? '[]',
        currency: slip.currency ?? 'USD',
      },
    })
  }
  return run
}

describe('myPayslips', () => {
  it('returns only the requested employee\'s payslips, newest first', async () => {
    const alice = await seedEmployee({ code: 'P01', firstName: 'Alice' })
    const bob = await seedEmployee({ code: 'P02', firstName: 'Bob' })

    const oldRun = await seedRun({
      periodStart: '2026-01-01',
      periodEnd: '2026-01-31',
      payslips: [
        { employeeId: alice.id, grossPay: 5000, netPay: 4000 },
        { employeeId: bob.id, grossPay: 6000, netPay: 4800 },
      ],
    })
    const newRun = await seedRun({
      periodStart: '2026-02-01',
      periodEnd: '2026-02-28',
      payslips: [{ employeeId: alice.id, grossPay: 5500, netPay: 4400 }],
    })

    const aliceSlips = await myPayslips(alice.id)
    expect(aliceSlips.map((s) => s.payslipRun.id)).toEqual([newRun.id, oldRun.id])
    expect(aliceSlips.every((s) => s.employeeId === alice.id)).toBe(true)
  })

  it('returns an empty array when the employee has no payslips', async () => {
    const ghost = await seedEmployee({ code: 'P03' })
    expect(await myPayslips(ghost.id)).toEqual([])
  })
})

describe('getPayslip', () => {
  it('returns null for an unknown id', async () => {
    expect(await getPayslip('does-not-exist')).toBeNull()
  })

  it('returns the payslip when no viewer scope is enforced', async () => {
    const alice = await seedEmployee({ code: 'P04' })
    await seedRun({
      periodStart: '2026-03-01',
      periodEnd: '2026-03-31',
      payslips: [{ employeeId: alice.id, grossPay: 1000, netPay: 800 }],
    })
    const slip = await testPrisma.payslip.findFirstOrThrow()

    const result = await getPayslip(slip.id)
    expect(result?.id).toBe(slip.id)
    expect(result?.employee.id).toBe(alice.id)
  })

  it('hides another employee\'s payslip from a viewer-scoped lookup', async () => {
    const alice = await seedEmployee({ code: 'P05' })
    const bob = await seedEmployee({ code: 'P06' })
    await seedRun({
      periodStart: '2026-03-01',
      periodEnd: '2026-03-31',
      payslips: [{ employeeId: alice.id, grossPay: 1000, netPay: 800 }],
    })
    const slip = await testPrisma.payslip.findFirstOrThrow()

    expect(await getPayslip(slip.id, alice.id)).not.toBeNull()
    expect(await getPayslip(slip.id, bob.id)).toBeNull()
  })
})

describe('listPayslipRuns', () => {
  it('lists runs newest-first with a payslip count', async () => {
    const alice = await seedEmployee({ code: 'P07' })
    const bob = await seedEmployee({ code: 'P08' })
    const older = await seedRun({
      periodStart: '2026-01-01',
      periodEnd: '2026-01-31',
      payslips: [{ employeeId: alice.id, grossPay: 1, netPay: 1 }],
    })
    const newer = await seedRun({
      periodStart: '2026-02-01',
      periodEnd: '2026-02-28',
      payslips: [
        { employeeId: alice.id, grossPay: 1, netPay: 1 },
        { employeeId: bob.id, grossPay: 1, netPay: 1 },
      ],
    })

    const runs = await listPayslipRuns()
    expect(runs.map((r) => r.id)).toEqual([newer.id, older.id])
    const newerEntry = runs.find((r) => r.id === newer.id)!
    expect(newerEntry._count.payslips).toBe(2)
  })
})

describe('getPayslipRun', () => {
  it('returns the run with its payslips ordered by employee last name', async () => {
    const z = await seedEmployee({ code: 'PZ', firstName: 'Zed', lastName: 'Zulu' })
    const a = await seedEmployee({ code: 'PA', firstName: 'Anna', lastName: 'Alpha' })

    const run = await seedRun({
      periodStart: '2026-04-01',
      periodEnd: '2026-04-30',
      payslips: [
        { employeeId: z.id, grossPay: 100, netPay: 80 },
        { employeeId: a.id, grossPay: 200, netPay: 160 },
      ],
    })

    const result = await getPayslipRun(run.id)
    expect(result?.payslips.map((p) => p.employee.lastName)).toEqual(['Alpha', 'Zulu'])
  })

  it('returns null for an unknown run id', async () => {
    expect(await getPayslipRun('missing')).toBeNull()
  })
})

describe('payrollDashboard', () => {
  it('aggregates totals, monthly breakdown, and department breakdown', async () => {
    const eng = await seedEmployee({ code: 'D01', departmentName: 'Engineering' })
    const sales = await seedEmployee({ code: 'D02', departmentName: 'Sales' })
    const unassigned = await seedEmployee({ code: 'D03' })

    const jan = await seedRun({
      periodStart: '2026-01-01',
      periodEnd: '2026-01-31',
      status: 'finalized',
      payslips: [
        { employeeId: eng.id, grossPay: 1000, netPay: 800 },
        { employeeId: sales.id, grossPay: 500, netPay: 400 },
      ],
    })
    await seedRun({
      periodStart: '2026-02-01',
      periodEnd: '2026-02-28',
      status: 'draft',
      payslips: [{ employeeId: unassigned.id, grossPay: 300, netPay: 250 }],
    })

    const d = await payrollDashboard()

    expect(d.totalRuns).toBe(2)
    expect(d.finalizedRuns).toBe(1)
    expect(d.draftRuns).toBe(1)
    expect(d.totalGross).toBe(1800)
    expect(d.totalNet).toBe(1450)

    // byMonth sorted ascending — Jan before Feb
    expect(d.byMonth.map((m) => m.month)).toEqual(['2026-01', '2026-02'])
    expect(d.byMonth[0]).toMatchObject({ gross: 1500, net: 1200, count: 2 })
    expect(d.byMonth[1]).toMatchObject({ gross: 300, net: 250, count: 1 })

    // byDepartment sorted by gross desc — Engineering > Sales > Unassigned
    expect(d.byDepartment.map((b) => b.department)).toEqual(['Engineering', 'Sales', 'Unassigned'])

    // latestRun is Feb (newest periodStart), with its own totals
    expect(d.latestRun?.id).not.toBe(jan.id)
    expect(d.latestRun).toMatchObject({ status: 'draft', payslips: 1, gross: 300, net: 250 })
  })

  it('returns an empty dashboard when no runs exist', async () => {
    const d = await payrollDashboard()
    expect(d).toMatchObject({
      totalRuns: 0,
      finalizedRuns: 0,
      draftRuns: 0,
      totalGross: 0,
      totalNet: 0,
      byMonth: [],
      byDepartment: [],
      byCurrency: [],
      missingRates: [],
      latestRun: null,
    })
    expect(d.baseCurrency).toBe('USD')
  })

  it('reports a byCurrency breakdown and converts to the base currency', async () => {
    const usEmp = await seedEmployee({ code: 'C01' })
    const pkEmp = await seedEmployee({ code: 'C02' })

    await seedRun({
      periodStart: '2026-03-01',
      periodEnd: '2026-03-31',
      payslips: [
        { employeeId: usEmp.id, grossPay: 5_000, netPay: 4_000, currency: 'USD' },
        { employeeId: pkEmp.id, grossPay: 278_500, netPay: 250_000, currency: 'PKR' },
      ],
    })

    const d = await payrollDashboard()
    expect(d.baseCurrency).toBe('USD')
    expect(d.byCurrency).toHaveLength(2)

    const usd = d.byCurrency.find((c) => c.currency === 'USD')!
    expect(usd).toMatchObject({
      currency: 'USD',
      nativeGross: 5_000,
      nativeNet: 4_000,
      convertedGross: 5_000,
      convertedNet: 4_000,
      count: 1,
      rate: 1,
    })

    const pkr = d.byCurrency.find((c) => c.currency === 'PKR')!
    // Default PKR rate is 278.5 → 278,500 PKR ≈ 1,000 USD
    expect(pkr.nativeGross).toBe(278_500)
    expect(pkr.convertedGross).toBeCloseTo(1_000, 0)
    expect(pkr.rate).toBeCloseTo(0.0036, 4)

    // Total = USD passthrough + PKR converted
    expect(d.totalGross).toBeCloseTo(6_000, 0)
    expect(d.missingRates).toEqual([])
  })

  it('bounds the working set to payslips from the last 24 months', async () => {
    const emp = await seedEmployee({ code: 'OLD', departmentName: 'Eng' })

    // 3 years old — must be excluded
    await seedRun({
      periodStart: '2023-01-01',
      periodEnd: '2023-01-31',
      payslips: [{ employeeId: emp.id, grossPay: 99_999, netPay: 99_999 }],
    })
    // Current month — must be included
    const now = new Date()
    const yyyy = now.getFullYear()
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    await seedRun({
      periodStart: `${yyyy}-${mm}-01`,
      periodEnd: `${yyyy}-${mm}-28`,
      payslips: [{ employeeId: emp.id, grossPay: 100, netPay: 80 }],
    })

    const d = await payrollDashboard()
    // Aggregates exclude the 3-year-old payslip — totals reflect only recent
    expect(d.totalGross).toBe(100)
    expect(d.totalNet).toBe(80)
  })

  it('flags currencies with no FX rate in missingRates', async () => {
    const emp = await seedEmployee({ code: 'C03' })
    await seedRun({
      periodStart: '2026-04-01',
      periodEnd: '2026-04-30',
      payslips: [
        { employeeId: emp.id, grossPay: 1_000, netPay: 800, currency: 'XYZ' },
      ],
    })

    const d = await payrollDashboard()
    expect(d.missingRates).toEqual(['XYZ'])
    // Unknown rate → amount falls through unchanged
    const xyz = d.byCurrency.find((c) => c.currency === 'XYZ')!
    expect(xyz.rate).toBeNull()
    expect(xyz.convertedGross).toBe(1_000)
  })
})

describe('payslipDeductions', () => {
  it('parses a well-formed JSON array of deduction lines', () => {
    const raw = JSON.stringify([
      { label: 'Tax', amount: 200 },
      { label: 'Insurance', amount: 50 },
    ])
    expect(payslipDeductions(raw)).toEqual([
      { label: 'Tax', amount: 200 },
      { label: 'Insurance', amount: 50 },
    ])
  })

  it('returns an empty list on malformed JSON', () => {
    expect(payslipDeductions('not json')).toEqual([])
  })

  it('returns an empty list when the JSON is not an array', () => {
    expect(payslipDeductions(JSON.stringify({ label: 'Tax', amount: 200 }))).toEqual([])
  })

  it('filters out items missing required fields', () => {
    const raw = JSON.stringify([
      { label: 'Tax', amount: 200 },
      { label: 'NoAmount' },
      { amount: 50 },
      'string-entry',
      null,
    ])
    expect(payslipDeductions(raw)).toEqual([{ label: 'Tax', amount: 200 }])
  })
})
