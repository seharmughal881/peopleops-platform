import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
async function main() {
  const admin = await p.employee.findUniqueOrThrow({ where: { employeeCode: 'EMP-0001' } })
  const jane = await p.employee.findUniqueOrThrow({ where: { employeeCode: 'EMP-0002' } })
  await p.employee.update({ where: { id: jane.id }, data: { managerId: admin.id } })
  console.log('Jane now reports to admin')
  await p.$disconnect()
}
main()
