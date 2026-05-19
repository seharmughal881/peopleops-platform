import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { prisma } from '@/lib/db/client'

export interface ClockEventInput {
  externalDeviceId: string
  externalEmployeeId: string
  event: 'in' | 'out'
  occurredAt?: Date
}

export interface ProcessResult {
  ok: boolean
  logId?: string
  error?: string
}

const SECRET_PEPPER = process.env.BIOMETRIC_SECRET_PEPPER ?? 'biometric-pepper-change-me'

export function generateDeviceSecret(): string {
  return randomBytes(32).toString('hex')
}

export function hashSecret(secret: string): string {
  return createHmac('sha256', SECRET_PEPPER).update(secret).digest('hex')
}

export function verifyBearerSecret(presented: string, storedHash: string): boolean {
  const a = Buffer.from(hashSecret(presented), 'hex')
  const b = Buffer.from(storedHash, 'hex')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export async function resolveDevice(externalDeviceId: string) {
  return prisma.biometricDevice.findUnique({ where: { externalDeviceId } })
}

export async function markDeviceSeen(deviceId: string) {
  await prisma.biometricDevice.update({ where: { id: deviceId }, data: { lastSeenAt: new Date() } })
}

export async function processClockEvent(input: ClockEventInput): Promise<ProcessResult> {
  const device = await prisma.biometricDevice.findUnique({ where: { externalDeviceId: input.externalDeviceId } })
  if (!device) return { ok: false, error: 'Unknown device' }
  if (device.status !== 'active') return { ok: false, error: 'Device disabled' }

  const credential = await prisma.biometricCredential.findUnique({
    where: { deviceId_externalEmployeeId: { deviceId: device.id, externalEmployeeId: input.externalEmployeeId } },
  })
  if (!credential) return { ok: false, error: 'Unknown employee credential' }

  const when = input.occurredAt ?? new Date()
  const open = await prisma.attendanceLog.findFirst({
    where: { employeeId: credential.employeeId, clockOut: null },
    orderBy: { clockIn: 'desc' },
  })

  if (input.event === 'in') {
    if (open) return { ok: false, error: 'Already clocked in', logId: open.id }
    const log = await prisma.attendanceLog.create({
      data: {
        employeeId: credential.employeeId,
        clockIn: when,
        source: 'biometric',
        deviceId: device.id,
      },
    })
    return { ok: true, logId: log.id }
  }

  if (!open) return { ok: false, error: 'No active clock-in' }
  const hours = (when.getTime() - new Date(open.clockIn).getTime()) / 3600000
  const status = hours > 8.5 ? 'overtime' : 'regular'
  const log = await prisma.attendanceLog.update({
    where: { id: open.id },
    data: { clockOut: when, status, deviceId: open.deviceId ?? device.id },
  })
  return { ok: true, logId: log.id }
}
