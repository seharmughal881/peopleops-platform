// Default chart-of-accounts mapping. Sites with their own GL can override via
// FINANCE_GL_MAP env var (JSON merged onto these defaults).
//
// Format:
//   {
//     "expense":  { "travel": { "account": "6100", "name": "Travel" }, ... },
//     "payroll":  { "gross":  { "account": "5000", "name": "Salaries & Wages" }, ... }
//   }

export type GLAccount = { account: string; name: string }
export type ExpenseCategoryKey = 'travel' | 'meals' | 'supplies' | 'training' | 'other'
export type PayrollLineKey = 'gross' | 'deductions' | 'net'

const EXPENSE_DEFAULTS: Record<ExpenseCategoryKey, GLAccount> = {
  travel:   { account: '6100', name: 'Travel' },
  meals:    { account: '6110', name: 'Meals & Entertainment' },
  supplies: { account: '6200', name: 'Office Supplies' },
  training: { account: '6300', name: 'Training & Development' },
  other:    { account: '6900', name: 'Other Operating Expenses' },
}

const PAYROLL_DEFAULTS: Record<PayrollLineKey, GLAccount> = {
  gross:      { account: '5000', name: 'Salaries & Wages' },
  deductions: { account: '2100', name: 'Payroll Liabilities' },
  net:        { account: '1010', name: 'Cash / Payroll Clearing' },
}

type Override = Partial<{
  expense: Partial<Record<ExpenseCategoryKey, Partial<GLAccount>>>
  payroll: Partial<Record<PayrollLineKey, Partial<GLAccount>>>
}>

let cached: { expense: Record<ExpenseCategoryKey, GLAccount>; payroll: Record<PayrollLineKey, GLAccount> } | null = null

function loadMapping() {
  if (cached) return cached
  let override: Override = {}
  const raw = process.env.FINANCE_GL_MAP
  if (raw) {
    try { override = JSON.parse(raw) }
    catch { console.warn('FINANCE_GL_MAP is not valid JSON; using defaults') }
  }
  const expense = { ...EXPENSE_DEFAULTS }
  for (const k of Object.keys(override.expense ?? {}) as ExpenseCategoryKey[]) {
    expense[k] = { ...expense[k], ...override.expense![k] } as GLAccount
  }
  const payroll = { ...PAYROLL_DEFAULTS }
  for (const k of Object.keys(override.payroll ?? {}) as PayrollLineKey[]) {
    payroll[k] = { ...payroll[k], ...override.payroll![k] } as GLAccount
  }
  cached = { expense, payroll }
  return cached
}

export function expenseGL(category: string): GLAccount {
  const map = loadMapping().expense
  return map[category as ExpenseCategoryKey] ?? map.other
}

export function payrollGL(line: PayrollLineKey): GLAccount {
  return loadMapping().payroll[line]
}

export function fullMapping() {
  return loadMapping()
}
