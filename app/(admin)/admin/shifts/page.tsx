import { prisma } from '@/lib/db/client'
import { listShiftPatterns, listShiftAssignments } from '@/lib/modules/attendance/shifts'
import { Card, CardHeader } from '@/lib/ui/Card'
import { Table, THead, TR, TH, TD } from '@/lib/ui/Table'
import { NewShiftForm } from './NewShiftForm'
import { AssignShiftForm } from './AssignShiftForm'

export default async function ShiftsPage() {
  const [patterns, assignments, employees] = await Promise.all([
    listShiftPatterns(),
    listShiftAssignments(),
    prisma.employee.findMany({
      where: { status: 'active' },
      select: { id: true, firstName: true, lastName: true, employeeCode: true },
      orderBy: [{ lastName: 'asc' }],
    }),
  ])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader title="Shift patterns" subtitle={`${patterns.length} defined`} />
            <Table>
              <THead>
                <TR><TH>Name</TH><TH>Hours</TH><TH>Break</TH><TH>Work days</TH><TH>Assigned</TH></TR>
              </THead>
              <tbody>
                {patterns.length === 0 && <TR><TD>No patterns yet.</TD></TR>}
                {patterns.map((p) => (
                  <TR key={p.id}>
                    <TD className="font-medium">{p.name}</TD>
                    <TD>{p.startTime} – {p.endTime}</TD>
                    <TD>{p.breakMinutes}min</TD>
                    <TD className="font-mono text-xs">{p.workDays}</TD>
                    <TD>{p._count.employeeShifts}</TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          </Card>
        </div>
        <div>
          <Card>
            <CardHeader title="New shift pattern" />
            <NewShiftForm />
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader title="Assignments" subtitle="Most recent 100" />
            <Table>
              <THead>
                <TR><TH>Employee</TH><TH>Shift</TH><TH>Effective from</TH></TR>
              </THead>
              <tbody>
                {assignments.length === 0 && <TR><TD>No assignments yet.</TD></TR>}
                {assignments.map((a) => (
                  <TR key={a.id}>
                    <TD>{a.employee.firstName} {a.employee.lastName} ({a.employee.employeeCode})</TD>
                    <TD>{a.shiftPattern.name} ({a.shiftPattern.startTime}–{a.shiftPattern.endTime})</TD>
                    <TD>{new Date(a.effectiveFrom).toLocaleDateString()}</TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          </Card>
        </div>
        <div>
          <Card>
            <CardHeader title="Assign shift" />
            <AssignShiftForm employees={employees} patterns={patterns} />
          </Card>
        </div>
      </div>
    </div>
  )
}
