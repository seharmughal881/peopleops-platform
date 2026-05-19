import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@/lib/db/client'
import { requireUser } from '@/lib/modules/auth'
import { hasPermission } from '@/lib/modules/auth/rbac'
import { getStorage } from '@/lib/storage'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ key: string[] }> }) {
  const { key: parts } = await ctx.params
  const key = parts.join('/')

  const user = await requireUser()

  // Resolve owner across Document, ExpenseReceipt, and Candidate (resume)
  let ownerEmployeeId: string | null = null
  let recruitmentOnly = false
  let displayName = 'file'

  const doc = await prisma.document.findFirst({ where: { s3Key: key } })
  if (doc) {
    ownerEmployeeId = doc.employeeId
    displayName = doc.name
  } else {
    const receipt = await prisma.expenseReceipt.findFirst({
      where: { s3Key: key },
      include: { expense: true },
    })
    if (receipt) {
      ownerEmployeeId = receipt.expense.employeeId
      displayName = receipt.name
    } else {
      const candidate = await prisma.candidate.findFirst({ where: { resumeS3Key: key } })
      if (candidate) {
        recruitmentOnly = true
        displayName = `${candidate.firstName}_${candidate.lastName}_resume`
      }
    }
  }
  if (!ownerEmployeeId && !recruitmentOnly) return new NextResponse('Not found', { status: 404 })

  const ownsIt = ownerEmployeeId !== null && user.employee?.id === ownerEmployeeId
  const canRead =
    ownsIt ||
    hasPermission(user.permissions, 'employee:read') ||
    hasPermission(user.permissions, 'expense:*')
  if (!canRead) return new NextResponse('Forbidden', { status: 403 })

  const obj = await getStorage().get(key)
  if (!obj) return new NextResponse('Not found', { status: 404 })

  const body = new Uint8Array(obj.body.byteLength)
  body.set(obj.body)

  return new NextResponse(body, {
    headers: {
      'Content-Type': obj.contentType,
      'Content-Length': String(obj.size),
      'Content-Disposition': `inline; filename="${displayName.replace(/"/g, '')}"`,
      'Cache-Control': 'private, max-age=60',
    },
  })
}
