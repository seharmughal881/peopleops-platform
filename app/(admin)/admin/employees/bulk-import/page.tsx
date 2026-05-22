import { Card, CardHeader } from '@/lib/ui/Card'
import { BulkImportForm } from './BulkImportForm'

export default function BulkImportPage() {
  return (
    <Card>
      <CardHeader
        title="Bulk import employees"
        subtitle="Upload a CSV to create up to 1000 employees in one go."
      />
      <BulkImportForm />
    </Card>
  )
}
