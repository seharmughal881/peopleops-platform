import { listEmployees } from '@/lib/modules/employee'
import { Card, CardHeader } from '@/lib/ui/Card'
import { OrgChart, type OrgPerson } from './OrgChart'

export default async function OrgChartPage() {
  const employees = await listEmployees()
  const people: OrgPerson[] = employees.map((e) => ({
    id: e.id,
    firstName: e.firstName,
    lastName: e.lastName,
    jobTitle: e.jobTitle ?? null,
    department: e.department?.name ?? null,
    email: e.user?.email ?? null,
    managerId: e.managerId ?? null,
  }))

  return (
    <Card>
      <CardHeader title="Organizational chart" subtitle="Drag to pan, scroll to zoom." />
      <OrgChart people={people} />
    </Card>
  )
}
