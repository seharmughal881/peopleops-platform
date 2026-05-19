import { NextRequest } from 'next/server'
import { requirePermission } from '@/lib/modules/auth'
import { recordAudit } from '@/lib/modules/audit'
import { exportExpensesCsv } from '@/lib/modules/finance'

export const dynamic = 'force-dynamic'

function parseDate(v: string | null): Date | undefined {
  if (!v) return undefined
  const d = new Date(v)
  return isNaN(d.getTime()) ? undefined : d
}

export async function GET(req: NextRequest) {
  const actor = await requirePermission('expense:*')

  const u = req.nextUrl
  const from = parseDate(u.searchParams.get('from'))
  const to = parseDate(u.searchParams.get('to'))
  const includeApproved = u.searchParams.get('include_approved') === '1'

  const { csv, rowCount } = await exportExpensesCsv(
    { from, to },
    { statuses: includeApproved ? ['approved', 'reimbursed'] : ['reimbursed'] },
  )

  await recordAudit({
    userId: actor.id,
    action: 'finance.export.expenses',
    entityType: 'Expense',
    entityId: 'csv',
    after: {
      rowCount,
      from: from?.toISOString() ?? null,
      to: to?.toISOString() ?? null,
      includeApproved,
    },
  })

  const stamp = new Date().toISOString().slice(0, 10)
  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="expenses-${stamp}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
