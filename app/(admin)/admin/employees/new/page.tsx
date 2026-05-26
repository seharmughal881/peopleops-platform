import { prisma } from '@/lib/db/client'
import { Card, CardHeader } from '@/lib/ui/Card'
import { NewEmployeeForm } from './NewEmployeeForm'

export default async function NewEmployeePage() {
  const departments = await prisma.department.findMany({ orderBy: { name: 'asc' } })
  const managers = await prisma.employee.findMany({
    where: { status: 'active' },
    orderBy: [{ lastName: 'asc' }],
    select: { id: true, firstName: true, lastName: true },
  })

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader title="Add employee" subtitle="Creates a user + employee record and assigns the selected role" />
        <NewEmployeeForm departments={departments} managers={managers} />
      </Card>
    </div>
  )
}
