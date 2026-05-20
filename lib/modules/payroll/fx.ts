// FX conversion to a base currency for cross-currency reporting (dashboards,
// payroll trend charts, etc). Rates are NOT live — they come from the
// PAYROLL_FX_RATES env var as a JSON map, e.g.
//   PAYROLL_FX_RATES={"PKR":278.5,"USD":1,"EUR":0.92}
// meaning "1 base unit = X foreign units". The base currency itself is
// PAYROLL_BASE_CURRENCY (default USD). Same-currency amounts pass through
// untouched; missing rates pass through with `convertedAt: null` so the UI
// can flag them.

const DEFAULT_RATES: Record<string, number> = {
  USD: 1,
  PKR: 278.5, // approximate; update via env in production
  EUR: 0.92,
  GBP: 0.78,
}

let cached: { rates: Record<string, number>; base: string } | null = null

function loadConfig(): { rates: Record<string, number>; base: string } {
  if (cached) return cached
  const base = (process.env.PAYROLL_BASE_CURRENCY ?? 'USD').toUpperCase()
  let rates = { ...DEFAULT_RATES }
  const raw = process.env.PAYROLL_FX_RATES
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') {
        for (const [k, v] of Object.entries(parsed)) {
          if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
            rates[k.toUpperCase()] = v
          }
        }
      }
    } catch {
      // fall back to defaults if env is malformed
    }
  }
  if (!rates[base]) rates[base] = 1
  cached = { rates, base }
  return cached
}

// For testing — drops the memoized config so the next call rereads env.
export function _resetFxCache() {
  cached = null
}

export function baseCurrency(): string {
  return loadConfig().base
}

export interface ConversionResult {
  amount: number
  fromCurrency: string
  toCurrency: string
  rate: number | null // null = no rate available, amount returned unchanged
}

export function convertToBase(amount: number, fromCurrency: string): ConversionResult {
  const { rates, base } = loadConfig()
  const from = fromCurrency.toUpperCase()
  if (from === base) return { amount: round2(amount), fromCurrency: from, toCurrency: base, rate: 1 }

  const fromRate = rates[from]
  const baseRate = rates[base]
  if (!fromRate || !baseRate) {
    return { amount: round2(amount), fromCurrency: from, toCurrency: base, rate: null }
  }
  // rates are "1 base unit = X foreign units"
  const converted = (amount / fromRate) * baseRate
  return { amount: round2(converted), fromCurrency: from, toCurrency: base, rate: round4(baseRate / fromRate) }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
function round4(n: number): number {
  return Math.round(n * 10000) / 10000
}
