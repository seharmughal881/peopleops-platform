// Progressive income tax across multiple jurisdictions. Each currency code
// maps to a slab table; the calculator picks the right table at call time.
// Slab figures must be verified against the latest Finance Act / IRS pub
// each fiscal year and updated here.

export interface TaxSlab {
  upTo: number | null // annual taxable income upper bound; null = open-ended
  base: number // tax accumulated at the lower bound of this slab
  rate: number // marginal rate applied to income above `threshold`
  threshold: number // lower bound of this slab (annual)
}

// Pakistan FBR — salaried individuals, FY 2024-25 (Finance Act 2024).
export const FBR_FY_2024_25: TaxSlab[] = [
  { threshold: 0,         upTo: 600_000,   base: 0,       rate: 0    },
  { threshold: 600_000,   upTo: 1_200_000, base: 0,       rate: 0.05 },
  { threshold: 1_200_000, upTo: 2_200_000, base: 30_000,  rate: 0.15 },
  { threshold: 2_200_000, upTo: 3_200_000, base: 180_000, rate: 0.25 },
  { threshold: 3_200_000, upTo: 4_100_000, base: 430_000, rate: 0.30 },
  { threshold: 4_100_000, upTo: null,      base: 700_000, rate: 0.35 },
]

// US IRS federal income tax — single filer, tax year 2024.
// State/local taxes, FICA, and the standard deduction are NOT applied here.
export const US_FEDERAL_FY_2024_SINGLE: TaxSlab[] = [
  { threshold: 0,       upTo: 11_600,  base: 0,           rate: 0.10 },
  { threshold: 11_600,  upTo: 47_150,  base: 1_160,       rate: 0.12 },
  { threshold: 47_150,  upTo: 100_525, base: 5_426,       rate: 0.22 },
  { threshold: 100_525, upTo: 191_950, base: 17_168.50,   rate: 0.24 },
  { threshold: 191_950, upTo: 243_725, base: 39_110.50,   rate: 0.32 },
  { threshold: 243_725, upTo: 609_350, base: 55_678.50,   rate: 0.35 },
  { threshold: 609_350, upTo: null,    base: 183_647.25,  rate: 0.37 },
]

export interface TaxJurisdiction {
  slabs: TaxSlab[]
  label: string // shown on the payslip deduction line
}

export const TAX_RULES_BY_CURRENCY: Record<string, TaxJurisdiction> = {
  PKR: { slabs: FBR_FY_2024_25,           label: 'Income tax (FBR)' },
  USD: { slabs: US_FEDERAL_FY_2024_SINGLE, label: 'Federal income tax' },
}

export function jurisdictionFor(currency: string): TaxJurisdiction | null {
  return TAX_RULES_BY_CURRENCY[currency] ?? null
}

export function annualIncomeTax(annualGross: number, slabs: TaxSlab[] = FBR_FY_2024_25): number {
  if (!Number.isFinite(annualGross) || annualGross <= 0) return 0
  for (const slab of slabs) {
    const inSlab = slab.upTo === null || annualGross <= slab.upTo
    if (inSlab) {
      const tax = slab.base + (annualGross - slab.threshold) * slab.rate
      return round2(Math.max(0, tax))
    }
  }
  return 0
}

export function monthlyIncomeTax(annualGross: number, slabs?: TaxSlab[]): number {
  return round2(annualIncomeTax(annualGross, slabs) / 12)
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
