import { describe, it, expect } from 'vitest'
import { computePayslip } from './engine'

describe('computePayslip', () => {
  it('applies FBR tax to PKR salaries above the threshold', () => {
    // monthly 100,000 PKR → annual 1.2M → tax 30k → monthly tax 2,500
    const result = computePayslip({ monthlySalary: 100_000, currency: 'PKR' })
    expect(result.grossPay).toBe(100_000)
    expect(result.deductions).toEqual([{ label: 'Income tax (FBR)', amount: 2_500 }])
    expect(result.netPay).toBe(97_500)
  })

  it('produces no deductions for PKR salaries below the threshold', () => {
    // monthly 50,000 PKR → annual 600k → tax 0
    const result = computePayslip({ monthlySalary: 50_000, currency: 'PKR' })
    expect(result.deductions).toEqual([])
    expect(result.netPay).toBe(50_000)
  })

  it('applies US federal tax to USD salaries', () => {
    // monthly 4,000 USD → annual 48,000 → 5,426 + 22% × 850 = 5,613
    // → monthly tax 467.75
    const result = computePayslip({ monthlySalary: 4_000, currency: 'USD' })
    expect(result.deductions).toEqual([{ label: 'Federal income tax', amount: 467.75 }])
    expect(result.netPay).toBe(3_532.25)
  })

  it('skips automatic tax for currencies without a registered jurisdiction', () => {
    const result = computePayslip({ monthlySalary: 5_000, currency: 'EUR' })
    expect(result.deductions).toEqual([])
    expect(result.netPay).toBe(5_000)
  })

  it('handles zero and negative salaries defensively', () => {
    expect(computePayslip({ monthlySalary: 0, currency: 'PKR' })).toEqual({
      grossPay: 0,
      deductions: [],
      netPay: 0,
    })
    expect(computePayslip({ monthlySalary: -500, currency: 'PKR' })).toEqual({
      grossPay: 0,
      deductions: [],
      netPay: 0,
    })
  })
})
