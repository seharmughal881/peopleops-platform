import { NextResponse, type NextRequest } from 'next/server'
import { requirePermission } from '@/lib/modules/auth'
import { buildEmployeeExport } from '@/lib/modules/compliance'
import { recordAudit } from '@/lib/modules/audit'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ employeeId: string }> }) {
  const actor = await requirePermission('employee:read')
  const { employeeId } = await ctx.params

  const payload = await buildEmployeeExport(employeeId)
  if (!payload) return new NextResponse('Employee not found', { status: 404 })

  await recordAudit({
    userId: actor.id,
    action: 'gdpr.export',
    entityType: 'Employee',
    entityId: employeeId,
  })

  const body = JSON.stringify(payload, null, 2)
  return new NextResponse(body, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="gdpr_export_${payload.subject.employeeCode}.json"`,
      'Cache-Control': 'no-store',
    },
  })
}
