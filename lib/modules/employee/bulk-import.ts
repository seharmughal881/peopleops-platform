'use server'

import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import Papa from 'papaparse'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/client'
import { requirePermission } from '@/lib/modules/auth'
import { recordAudit } from '@/lib/modules/audit'
import { sendInviteEmail } from '@/lib/modules/comms/emails'

const MAX_FILE_BYTES = 5 * 1024 * 1024
const MAX_ROWS = 1000

const RowSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  firstName: z.string().min(1).trim(),
  lastName: z.string().min(1).trim(),
  employeeCode: z.string().min(1).trim(),
  joinDate: z.coerce.date(),
  jobTitle: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined)),
  departmentName: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined)),
  managerEmail: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v.toLowerCase() : undefined)),
})

export interface BulkImportRowResult {
  row: number
  status: 'created' | 'skipped' | 'error'
  email?: string
  message?: string
  tempPassword?: string
  employeeId?: string
}

export interface BulkImportResult {
  ok: boolean
  error?: string
  created: number
  skipped: number
  errors: number
  rows: BulkImportRowResult[]
}

function genTempPassword(): string {
  // 12-char URL-safe random string.
  return crypto.randomBytes(9).toString('base64url')
}

export async function bulkImportEmployees(
  formData: FormData,
): Promise<BulkImportResult> {
  const actor = await requirePermission('employee:create')

  const file = formData.get('file')
  const dryRun = formData.get('dryRun') === '1'
  const sendInvites = formData.get('sendInvites') === '1'

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: 'No file uploaded.', created: 0, skipped: 0, errors: 0, rows: [] }
  }
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, error: 'File too large (max 5 MB).', created: 0, skipped: 0, errors: 0, rows: [] }
  }

  const text = await file.text()
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  })

  if (parsed.errors.length > 0) {
    const first = parsed.errors[0]
    return {
      ok: false,
      error: `CSV parse error at row ${first.row}: ${first.message}`,
      created: 0,
      skipped: 0,
      errors: 0,
      rows: [],
    }
  }

  const rawRows = parsed.data ?? []
  if (rawRows.length === 0) {
    return { ok: false, error: 'No rows found.', created: 0, skipped: 0, errors: 0, rows: [] }
  }
  if (rawRows.length > MAX_ROWS) {
    return {
      ok: false,
      error: `Too many rows (${rawRows.length}). Max ${MAX_ROWS} per import.`,
      created: 0,
      skipped: 0,
      errors: 0,
      rows: [],
    }
  }

  // Preload departments + managers for FK resolution in a single round-trip each.
  const departments = await prisma.department.findMany({ select: { id: true, name: true } })
  const deptByName = new Map(departments.map((d) => [d.name.trim().toLowerCase(), d.id]))

  const results: BulkImportRowResult[] = []
  let created = 0
  let skipped = 0
  let errors = 0

  for (let i = 0; i < rawRows.length; i++) {
    const csvRow = i + 2 // line number assuming row 1 is the header
    const raw = rawRows[i]
    const parseResult = RowSchema.safeParse(raw)
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0]
      results.push({
        row: csvRow,
        status: 'error',
        email: raw.email,
        message: `${issue.path.join('.')}: ${issue.message}`,
      })
      errors++
      continue
    }
    const data = parseResult.data

    // Lookup dept by name (case-insensitive).
    let departmentId: string | undefined
    if (data.departmentName) {
      const id = deptByName.get(data.departmentName.toLowerCase())
      if (!id) {
        results.push({
          row: csvRow,
          status: 'error',
          email: data.email,
          message: `Department not found: "${data.departmentName}"`,
        })
        errors++
        continue
      }
      departmentId = id
    }

    // Lookup manager by email.
    let managerId: string | undefined
    if (data.managerEmail) {
      const mgr = await prisma.user.findUnique({
        where: { email: data.managerEmail },
        select: { employee: { select: { id: true } } },
      })
      if (!mgr?.employee) {
        results.push({
          row: csvRow,
          status: 'error',
          email: data.email,
          message: `Manager email not found: ${data.managerEmail}`,
        })
        errors++
        continue
      }
      managerId = mgr.employee.id
    }

    // Skip if already exists (by email or employeeCode).
    const dup = await prisma.user.findFirst({
      where: {
        OR: [
          { email: data.email },
          { employee: { is: { employeeCode: data.employeeCode } } },
        ],
      },
      select: { id: true },
    })
    if (dup) {
      results.push({
        row: csvRow,
        status: 'skipped',
        email: data.email,
        message: 'Email or employee code already exists.',
      })
      skipped++
      continue
    }

    if (dryRun) {
      results.push({ row: csvRow, status: 'created', email: data.email, message: '(dry-run: would create)' })
      created++
      continue
    }

    const tempPassword = genTempPassword()
    const hashed = await bcrypt.hash(tempPassword, 10)

    try {
      const user = await prisma.user.create({
        data: { email: data.email, hashedPassword: hashed, status: 'active' },
      })
      const employee = await prisma.employee.create({
        data: {
          userId: user.id,
          firstName: data.firstName,
          lastName: data.lastName,
          employeeCode: data.employeeCode,
          joinDate: data.joinDate,
          jobTitle: data.jobTitle,
          departmentId,
          managerId,
        },
      })
      const empRole = await prisma.role.findUnique({ where: { name: 'employee' } })
      if (empRole) {
        await prisma.userRole.create({ data: { userId: user.id, roleId: empRole.id } })
      }
      await recordAudit({
        userId: actor.id,
        action: 'employee.bulk-imported',
        entityType: 'Employee',
        entityId: employee.id,
        after: {
          email: data.email,
          employeeCode: data.employeeCode,
          firstName: data.firstName,
          lastName: data.lastName,
        },
      })
      results.push({
        row: csvRow,
        status: 'created',
        email: data.email,
        tempPassword,
        employeeId: employee.id,
      })
      created++

      if (sendInvites) {
        const loginUrl = process.env.APP_URL ? `${process.env.APP_URL}/login` : '/login'
        await sendInviteEmail(user.id, {
          recipientName: `${data.firstName} ${data.lastName}`,
          loginUrl,
          tempPassword,
          inviterName: actor.email,
        }).catch(() => {
          // Don't fail the whole import on email enqueue issues.
        })
      }
    } catch (e) {
      results.push({
        row: csvRow,
        status: 'error',
        email: data.email,
        message: e instanceof Error ? e.message : 'Create failed',
      })
      errors++
    }
  }

  if (!dryRun && created > 0) revalidatePath('/admin/employees')

  return { ok: true, created, skipped, errors, rows: results }
}
