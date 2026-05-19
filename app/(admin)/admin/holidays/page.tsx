import { listHolidays } from '@/lib/modules/leave'
import { Card, CardHeader } from '@/lib/ui/Card'
import { Table, THead, TR, TH, TD } from '@/lib/ui/Table'
import { NewHolidayForm } from './NewHolidayForm'
import { DeleteHolidayButton } from './DeleteHolidayButton'

export default async function HolidaysPage() {
  const holidays = await listHolidays('US')

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader title="Holiday calendar" subtitle={`${holidays.length} entries (US)`} />
          <Table>
            <THead>
              <TR><TH>Date</TH><TH>Name</TH><TH>Country</TH><TH></TH></TR>
            </THead>
            <tbody>
              {holidays.length === 0 && <TR><TD>No holidays yet.</TD></TR>}
              {holidays.map((h) => (
                <TR key={h.id}>
                  <TD>{new Date(h.date).toLocaleDateString()}</TD>
                  <TD className="font-medium">{h.name}</TD>
                  <TD>{h.country}</TD>
                  <TD><DeleteHolidayButton id={h.id} /></TD>
                </TR>
              ))}
            </tbody>
          </Table>
        </Card>
      </div>
      <div>
        <Card>
          <CardHeader title="Add holiday" />
          <NewHolidayForm />
        </Card>
      </div>
    </div>
  )
}
