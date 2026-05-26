import { requireUser } from '@/lib/modules/auth'
import { attendanceRosterRange } from '@/lib/modules/reporting'
import { csvResponse, rowsToCsv, type ExportColumn } from '@/lib/export'

export const dynamic = 'force-dynamic'

type PeriodKey = 'day' | 'week' | 'month'

function parseDate(raw: string | null): Date {
  if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const d = new Date(`${raw}T00:00:00`)
    if (!isNaN(d.getTime())) return d
  }
  return new Date()
}

function resolvePeriod(raw: string | null): PeriodKey {
  return raw === 'week' || raw === 'month' ? raw : 'day'
}

function rangeFor(period: PeriodKey, ref: Date): { start: Date; end: Date } {
  if (period === 'day') {
    const start = new Date(ref)
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)
    return { start, end }
  }
  if (period === 'week') {
    const start = new Date(ref)
    start.setHours(0, 0, 0, 0)
    const dow = start.getDay()
    const offset = dow === 0 ? -6 : 1 - dow
    start.setDate(start.getDate() + offset)
    const end = new Date(start)
    end.setDate(end.getDate() + 7)
    return { start, end }
  }
  return {
    start: new Date(ref.getFullYear(), ref.getMonth(), 1),
    end: new Date(ref.getFullYear(), ref.getMonth() + 1, 1),
  }
}

function toYmd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function toHm(d: Date | null): string {
  if (!d) return ''
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

export async function GET(req: Request) {
  const user = await requireUser()
  const isAdmin =
    user.roles.includes('super_admin') ||
    user.roles.includes('hr_admin') ||
    user.permissions.includes('*')
  if (!isAdmin) return new Response('Forbidden', { status: 403 })

  const url = new URL(req.url)
  const sp = url.searchParams
  const ref = parseDate(sp.get('date'))
  const period = resolvePeriod(sp.get('period'))
  const q = (sp.get('q') ?? '').trim().toLowerCase()
  const dept = (sp.get('dept') ?? '').trim()
  const status = (sp.get('status') ?? '').trim()
  const employeeId = (sp.get('employeeId') ?? '').trim()

  const { start, end } = rangeFor(period, ref)
  const allRows = await attendanceRosterRange(start, end)

  const rows = allRows.filter((r) => {
    if (employeeId && r.employeeId !== employeeId) return false
    if (q) {
      const hay = `${r.name} ${r.employeeCode} ${r.department ?? ''}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    if (dept && r.department !== dept) return false
    if (status && status !== 'all') {
      if (status === 'late' && !r.isLate) return false
      if (status === 'on-time' && r.isLate) return false
      if (status === 'working' && r.clockOut) return false
      if (status === 'done' && (!r.clockOut || r.status === 'overtime' || r.status === 'missed')) return false
      if (status === 'overtime' && r.status !== 'overtime' && r.overtimeHours <= 0) return false
      if (status === 'missed' && r.status !== 'missed') return false
    }
    return true
  })

  type Row = (typeof rows)[number]
  const columns: ExportColumn<Row>[] = [
    { key: 'date', header: 'Date', value: (r) => toYmd(r.clockIn) },
    { key: 'code', header: 'Employee code', value: (r) => r.employeeCode },
    { key: 'name', header: 'Employee', value: (r) => r.name },
    { key: 'department', header: 'Department', value: (r) => r.department ?? '' },
    { key: 'clockIn', header: 'Check-in', value: (r) => toHm(r.clockIn) },
    { key: 'clockOut', header: 'Check-out', value: (r) => toHm(r.clockOut) },
    { key: 'late', header: 'Late', value: (r) => (r.isLate ? 'yes' : 'no') },
    {
      key: 'breaks',
      header: 'Break (min)',
      value: (r) => String(r.regularBreakMinutes),
    },
    {
      key: 'namaz',
      header: 'Namaz (min)',
      value: (r) => String(r.namazBreakMinutes),
    },
    {
      key: 'netHours',
      header: 'Net hours',
      value: (r) => (r.netHours != null ? r.netHours.toFixed(2) : ''),
    },
    {
      key: 'overtime',
      header: 'Overtime hours',
      value: (r) => r.overtimeHours.toFixed(2),
    },
    { key: 'status', header: 'Status', value: (r) => r.status },
  ]

  const csv = rowsToCsv(rows, columns)
  const stamp = toYmd(ref)
  return csvResponse(csv, `attendance_${period}_${stamp}.csv`)
}
