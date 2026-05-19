import { requireUser } from '@/lib/modules/auth'
import { myPayslips } from '@/lib/modules/payroll'
import { Card, CardHeader } from '@/lib/ui/Card'
import { Table, THead, TR, TH, TD } from '@/lib/ui/Table'

export default async function PayslipsPage() {
  const user = await requireUser()
  if (!user.employee) return <Card>No employee record.</Card>

  const payslips = await myPayslips(user.employee.id)

  return (
    <Card>
      <CardHeader title="Payslips" subtitle="Your past pay statements" />
      <Table>
        <THead>
          <TR>
            <TH>Period</TH>
            <TH>Gross</TH>
            <TH>Net</TH>
            <TH>Status</TH>
            <TH></TH>
          </TR>
        </THead>
        <tbody>
          {payslips.length === 0 && (
            <TR><TD>No payslips yet.</TD><TD></TD><TD></TD><TD></TD><TD></TD></TR>
          )}
          {payslips.map((p) => (
            <TR key={p.id}>
              <TD>
                {new Date(p.payslipRun.periodStart).toLocaleDateString()} – {new Date(p.payslipRun.periodEnd).toLocaleDateString()}
              </TD>
              <TD>${p.grossPay.toFixed(2)}</TD>
              <TD>${p.netPay.toFixed(2)}</TD>
              <TD>{p.payslipRun.status}</TD>
              <TD>{p.s3Key ? 'PDF available' : '—'}</TD>
            </TR>
          ))}
        </tbody>
      </Table>
    </Card>
  )
}
