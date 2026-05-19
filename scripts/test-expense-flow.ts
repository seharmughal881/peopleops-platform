import { PrismaClient } from '@prisma/client'
import { getStorage, buildKey } from '../lib/storage'

const p = new PrismaClient()
async function main() {
  const jane = await p.employee.findUniqueOrThrow({ where: { employeeCode: 'EMP-0002' } })
  const expense = await p.expense.create({
    data: {
      employeeId: jane.id,
      category: 'travel',
      amount: 150.50,
      currency: 'USD',
      expenseDate: new Date(),
      description: 'Smoke test: client meeting taxi',
      status: 'draft',
    },
  })
  console.log('Draft created:', expense.id, 'amount:', expense.amount)

  const bytes = new TextEncoder().encode('Fake receipt (test only)')
  const key = buildKey(`receipts/${expense.id}`, 'taxi.txt')
  await getStorage().put(key, bytes, 'text/plain')
  await p.expenseReceipt.create({ data: { expenseId: expense.id, name: 'taxi.txt', s3Key: key } })
  console.log('Receipt attached')

  console.log('EXPENSE_ID=' + expense.id)
  await p.$disconnect()
}
main()
