import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@/lib/db/client'
import {
  markDeviceSeen,
  processClockEvent,
  verifyBearerSecret,
  type ClockEventInput,
  type ProcessResult,
} from '@/lib/modules/integrations/biometric'

export const dynamic = 'force-dynamic'

interface IncomingEvent {
  externalEmployeeId?: unknown
  event?: unknown
  occurredAt?: unknown
}

interface IncomingBody {
  externalEmployeeId?: unknown
  event?: unknown
  occurredAt?: unknown
  events?: IncomingEvent[]
}

function parseEvent(externalDeviceId: string, raw: IncomingEvent): ClockEventInput | { error: string } {
  if (typeof raw.externalEmployeeId !== 'string' || !raw.externalEmployeeId)
    return { error: 'externalEmployeeId required' }
  if (raw.event !== 'in' && raw.event !== 'out')
    return { error: 'event must be "in" or "out"' }
  let occurredAt: Date | undefined
  if (raw.occurredAt != null) {
    const d = new Date(raw.occurredAt as string)
    if (Number.isNaN(d.getTime())) return { error: 'invalid occurredAt' }
    occurredAt = d
  }
  return { externalDeviceId, externalEmployeeId: raw.externalEmployeeId, event: raw.event, occurredAt }
}

export async function POST(req: NextRequest) {
  const externalDeviceId = req.headers.get('x-biometric-device-id')?.trim()
  const auth = req.headers.get('authorization')?.trim()
  if (!externalDeviceId) return NextResponse.json({ error: 'x-biometric-device-id required' }, { status: 400 })
  if (!auth?.toLowerCase().startsWith('bearer '))
    return NextResponse.json({ error: 'Authorization: Bearer <secret> required' }, { status: 401 })
  const presented = auth.slice(7).trim()

  const device = await prisma.biometricDevice.findUnique({ where: { externalDeviceId } })
  if (!device) return NextResponse.json({ error: 'Unknown device' }, { status: 401 })
  if (!verifyBearerSecret(presented, device.secretHash))
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 })
  if (device.status !== 'active')
    return NextResponse.json({ error: 'Device disabled' }, { status: 403 })

  const body = (await req.json().catch(() => null)) as IncomingBody | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })

  const incoming: IncomingEvent[] = Array.isArray(body.events)
    ? body.events
    : [{ externalEmployeeId: body.externalEmployeeId, event: body.event, occurredAt: body.occurredAt }]
  if (incoming.length === 0) return NextResponse.json({ error: 'No events' }, { status: 400 })
  if (incoming.length > 100) return NextResponse.json({ error: 'Too many events (max 100)' }, { status: 400 })

  const results: Array<ProcessResult & { externalEmployeeId?: string }> = []
  for (const raw of incoming) {
    const parsed = parseEvent(externalDeviceId, raw)
    if ('error' in parsed) {
      results.push({ ok: false, error: parsed.error, externalEmployeeId: String(raw.externalEmployeeId ?? '') })
      continue
    }
    const r = await processClockEvent(parsed)
    results.push({ ...r, externalEmployeeId: parsed.externalEmployeeId })
  }

  await markDeviceSeen(device.id)
  const okCount = results.filter((r) => r.ok).length
  return NextResponse.json({ processed: okCount, total: results.length, results })
}
