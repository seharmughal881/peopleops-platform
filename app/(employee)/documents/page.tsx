import Link from 'next/link'
import { requireUser } from '@/lib/modules/auth'
import { listDocumentsFor } from '@/lib/modules/employee/documents'
import { Card, CardHeader } from '@/lib/ui/Card'
import { Table, THead, TR, TH, TD, Badge } from '@/lib/ui/Table'
import { UploadDocForm } from './UploadDocForm'

export default async function MyDocumentsPage() {
  const user = await requireUser()
  if (!user.employee) return <Card>No employee record.</Card>

  const docs = await listDocumentsFor(user.employee.id)

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader title="My documents" />
          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Type</TH>
                <TH>Uploaded</TH>
                <TH>Expires</TH>
                <TH></TH>
              </TR>
            </THead>
            <tbody>
              {docs.length === 0 && <TR><TD>No documents yet.</TD></TR>}
              {docs.map((d) => (
                <TR key={d.id}>
                  <TD>{d.name}</TD>
                  <TD><Badge>{d.type}</Badge></TD>
                  <TD>{new Date(d.uploadedAt).toLocaleDateString()}</TD>
                  <TD>{d.expiresAt ? new Date(d.expiresAt).toLocaleDateString() : '—'}</TD>
                  <TD>
                    <Link href={`/api/files/${d.s3Key}`} className="text-accent-deep hover:underline" target="_blank">
                      View
                    </Link>
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        </Card>
      </div>
      <div>
        <Card>
          <CardHeader title="Upload document" subtitle="PDF, PNG, JPG, DOCX up to 20 MB" />
          <UploadDocForm employeeId={user.employee.id} />
        </Card>
      </div>
    </div>
  )
}
