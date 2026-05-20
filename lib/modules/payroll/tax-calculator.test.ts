import { describe, it, expect } from 'vitest'
import {
  annualIncomeTax,
  monthlyIncomeTax,
  jurisdictionFor,
  FBR_FY_2024_25,
  US_FEDERAL_FY_2024_SINGLE,
} from './tax-calculator'

describe('FBR FY 2024-25 income tax', () => {
  it('returns 0 below the 600k threshold', () => {
    expect(annualIncomeTax(0)).toBe(0)
    expect(annualIncomeTax(500_000)).toBe(0)
    expect(annualIncomeTax(600_000)).toBe(0)
  })

  it('applies 5% in the 600k–1.2M slab', () => {
    expect(annualIncomeTax(900_000)).toBe(15_000) // 5% × 300k
    expect(annualIncomeTax(1_200_000)).toBe(30_000) // 5% × 600k
  })

  it('applies 30k + 15% in the 1.2M–2.2M slab', () => {
    expect(annualIncomeTax(1_500_000)).toBe(75_000) // 30k + 15% × 300k
    expect(annualIncomeTax(2_200_000)).toBe(180_000) // 30k + 15% × 1M
  })

  it('applies 180k + 25% in the 2.2M–3.2M slab', () => {
    expect(annualIncomeTax(2_700_000)).toBe(305_000) // 180k + 25% × 500k
    expect(annualIncomeTax(3_200_000)).toBe(430_000)
  })

  it('applies 430k + 30% in the 3.2M–4.1M slab', () => {
    expect(annualIncomeTax(3_500_000)).toBe(520_000) // 430k + 30% × 300k
    expect(annualIncomeTax(4_100_000)).toBe(700_000)
  })

  it('applies 700k + 35% above 4.1M', () => {
    expect(annualIncomeTax(5_000_000)).toBe(1_015_000) // 700k + 35% × 900k
    expect(annualIncomeTax(10_000_000)).toBe(2_765_000) // 700k + 35% × 5.9M
  })

  it('treats negative and non-finite gross as 0', () => {
    expect(annualIncomeTax(-1)).toBe(0)
    expect(annualIncomeTax(NaN)).toBe(0)
    expect(annualIncomeTax(Infinity)).toBe(0)
  })

  it('honors a custom slab table', () => {
    const flat10: typeof FBR_FY_2024_25 = [
      { threshold: 0, upTo: null, base: 0, rate: 0.1 },
    ]
    expect(annualIncomeTax(1_000_000, flat10)).toBe(100_000)
  })

  it('monthlyIncomeTax divides annual tax by 12', () => {
    expect(monthlyIncomeTax(1_200_000)).toBe(2_500) // 30k / 12
    expect(monthlyIncomeTax(600_000)).toBe(0)
  })
})

describe('US federal tax (single, FY 2024)', () => {
  const slabs = US_FEDERAL_FY_2024_SINGLE

  it('applies 10% in the bottom bracket', () => {
    expect(annualIncomeTax(10_000, slabs)).toBe(1_000)
    expect(annualIncomeTax(11_600, slabs)).toBe(1_160)
  })

  it('applies 12% from 11,600 to 47,150', () => {
    // 1,160 + 12% × (30,000 − 11,600) = 1,160 + 2,208 = 3,368
    expect(annualIncomeTax(30_000, slabs)).toBe(3_368)
    // 1,160 + 12% × 35,550 = 1,160 + 4,266 = 5,426
    expect(annualIncomeTax(47_150, slabs)).toBe(5_426)
  })

  it('applies 22% from 47,150 to 100,525', () => {
    // 5,426 + 22% × (80,000 − 47,150) = 5,426 + 7,227 = 12,653
    expect(annualIncomeTax(80_000, slabs)).toBe(12_653)
  })

  it('applies 37% above 609,350', () => {
    // 183,647.25 + 37% × (1,000,000 − 609,350) = 183,647.25 + 144,540.5 = 328,187.75
    expect(annualIncomeTax(1_000_000, slabs)).toBe(328_187.75)
  })
})

describe('jurisdictionFor', () => {
  it('maps PKR to the FBR slabs', () => {
    expect(jurisdictionFor('PKR')?.slabs).toBe(FBR_FY_2024_25)
    expect(jurisdictionFor('PKR')?.label).toBe('Income tax (FBR)')
  })

  it('maps USD to the US federal slabs', () => {
    expect(jurisdictionFor('USD')?.slabs).toBe(US_FEDERAL_FY_2024_SINGLE)
    expect(jurisdictionFor('USD')?.label).toBe('Federal income tax')
  })

  it('returns null for unregistered currencies', () => {
    expect(jurisdictionFor('EUR')).toBeNull()
    expect(jurisdictionFor('GBP')).toBeNull()
    expect(jurisdictionFor('XYZ')).toBeNull()
  })
})
