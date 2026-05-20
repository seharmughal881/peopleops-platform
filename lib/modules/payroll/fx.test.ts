import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { baseCurrency, convertToBase, _resetFxCache } from './fx'

const ORIGINAL_RATES = process.env.PAYROLL_FX_RATES
const ORIGINAL_BASE = process.env.PAYROLL_BASE_CURRENCY

function clearEnv() {
  delete process.env.PAYROLL_FX_RATES
  delete process.env.PAYROLL_BASE_CURRENCY
}

beforeEach(() => {
  clearEnv()
  _resetFxCache()
})

afterEach(() => {
  if (ORIGINAL_RATES === undefined) delete process.env.PAYROLL_FX_RATES
  else process.env.PAYROLL_FX_RATES = ORIGINAL_RATES
  if (ORIGINAL_BASE === undefined) delete process.env.PAYROLL_BASE_CURRENCY
  else process.env.PAYROLL_BASE_CURRENCY = ORIGINAL_BASE
  _resetFxCache()
})

describe('convertToBase', () => {
  it('defaults to USD as the base currency', () => {
    expect(baseCurrency()).toBe('USD')
  })

  it('passes through same-currency amounts with rate=1', () => {
    const r = convertToBase(1_000, 'USD')
    expect(r).toEqual({ amount: 1_000, fromCurrency: 'USD', toCurrency: 'USD', rate: 1 })
  })

  it('converts PKR to USD using the default rate', () => {
    // default PKR rate 278.5 → 100,000 PKR ≈ 359.07 USD
    const r = convertToBase(100_000, 'PKR')
    expect(r.toCurrency).toBe('USD')
    expect(r.amount).toBeCloseTo(359.07, 1)
    expect(r.rate).toBeCloseTo(0.0036, 4)
  })

  it('uses env-provided rates over defaults', () => {
    process.env.PAYROLL_FX_RATES = JSON.stringify({ PKR: 250, USD: 1 })
    _resetFxCache()
    const r = convertToBase(50_000, 'PKR')
    expect(r.amount).toBe(200) // 50,000 / 250
  })

  it('honors a non-USD base currency from env', () => {
    process.env.PAYROLL_BASE_CURRENCY = 'PKR'
    process.env.PAYROLL_FX_RATES = JSON.stringify({ PKR: 280, USD: 1 })
    _resetFxCache()
    expect(baseCurrency()).toBe('PKR')
    // 1000 USD × 280 = 280,000 PKR
    const r = convertToBase(1_000, 'USD')
    expect(r.toCurrency).toBe('PKR')
    expect(r.amount).toBe(280_000)
  })

  it('returns rate=null and amount unchanged for unknown currencies', () => {
    const r = convertToBase(500, 'XYZ')
    expect(r.amount).toBe(500)
    expect(r.rate).toBeNull()
  })

  it('falls back to defaults when PAYROLL_FX_RATES is malformed JSON', () => {
    process.env.PAYROLL_FX_RATES = '{not json'
    _resetFxCache()
    const r = convertToBase(100_000, 'PKR')
    // Falls back to default 278.5 rate
    expect(r.amount).toBeCloseTo(359.07, 1)
  })

  it('ignores non-positive and non-finite env rates', () => {
    process.env.PAYROLL_FX_RATES = JSON.stringify({ PKR: -1, EUR: 'bad', USD: 1 })
    _resetFxCache()
    // PKR rate invalid → falls back to default 278.5
    const r = convertToBase(100_000, 'PKR')
    expect(r.amount).toBeCloseTo(359.07, 1)
  })
})
