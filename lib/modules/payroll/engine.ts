import { monthlyIncomeTax, jurisdictionFor } from './tax-calculator'
import type { PayrollDeductionLine } from './queries'

export interface PayslipComputation {
  grossPay: number
  deductions: PayrollDeductionLine[]
  netPay: number
}

export interface EmployeePayrollInput {
  monthlySalary: number
  currency: string
}

// Income tax is dispatched by currency via TAX_RULES_BY_CURRENCY. Currencies
// without a registered jurisdiction (e.g. EUR, GBP) compute gross = net with
// no automatic deduction — admins must add manual lines.
export function computePayslip(input: EmployeePayrollInput): PayslipComputation {
  const grossPay = round2(Math.max(0, input.monthlySalary))
  const deductions: PayrollDeductionLine[] = []

  if (grossPay > 0) {
    const j = jurisdictionFor(input.currency)
    if (j) {
      const tax = monthlyIncomeTax(grossPay * 12, j.slabs)
      if (tax > 0) deductions.push({ label: j.label, amount: tax })
    }
  }

  const totalDeductions = deductions.reduce((s, d) => s + d.amount, 0)
  const netPay = round2(grossPay - totalDeductions)
  return { grossPay, deductions, netPay }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
