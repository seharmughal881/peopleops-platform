import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as OTPAuth from 'otpauth'

const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    update: vi.fn(),
  },
}))

vi.mock('@/lib/db/client', () => ({ prisma: prismaMock }))

import {
  getMfaStatus,
  startEnrollment,
  verifyEnrollment,
  verifyChallenge,
  disable,
  isMfaRequired,
} from './mfa'

const EMAIL = 'alice@example.com'
const USER_ID = 'user-1'

function currentTotpFor(base32Secret: string, label = EMAIL): string {
  return new OTPAuth.TOTP({
    issuer: 'HR System',
    label,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(base32Secret),
  }).generate()
}

beforeEach(() => {
  prismaMock.user.findUnique.mockReset()
  prismaMock.user.findUniqueOrThrow.mockReset()
  prismaMock.user.update.mockReset()
})

describe('getMfaStatus', () => {
  it('returns enabled=true when the user has MFA enabled', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ mfaEnabled: true })
    await expect(getMfaStatus(USER_ID)).resolves.toEqual({ enabled: true })
  })

  it('returns enabled=false when MFA is disabled', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ mfaEnabled: false })
    await expect(getMfaStatus(USER_ID)).resolves.toEqual({ enabled: false })
  })

  it('returns enabled=false when user is not found', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null)
    await expect(getMfaStatus(USER_ID)).resolves.toEqual({ enabled: false })
  })
})

describe('isMfaRequired', () => {
  it('mirrors getMfaStatus.enabled', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ mfaEnabled: true })
    await expect(isMfaRequired(USER_ID)).resolves.toBe(true)

    prismaMock.user.findUnique.mockResolvedValue({ mfaEnabled: false })
    await expect(isMfaRequired(USER_ID)).resolves.toBe(false)
  })
})

describe('startEnrollment', () => {
  it('refuses to re-enroll a user who already has MFA enabled', async () => {
    prismaMock.user.findUniqueOrThrow.mockResolvedValue({ email: EMAIL, mfaEnabled: true })
    await expect(startEnrollment(USER_ID)).rejects.toThrow(/already enabled/)
    expect(prismaMock.user.update).not.toHaveBeenCalled()
  })

  it('stores a fresh base32 secret and returns an otpauth URL for the user', async () => {
    prismaMock.user.findUniqueOrThrow.mockResolvedValue({ email: EMAIL, mfaEnabled: false })
    prismaMock.user.update.mockResolvedValue({})

    const result = await startEnrollment(USER_ID)

    expect(result.secret).toMatch(/^[A-Z2-7]+$/) // base32
    expect(result.otpauthUrl).toContain('otpauth://totp/')
    expect(result.otpauthUrl).toContain(encodeURIComponent('HR System'))
    expect(result.otpauthUrl).toContain(encodeURIComponent(EMAIL))

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: USER_ID },
      data: { mfaSecret: result.secret },
    })
  })
})

describe('verifyEnrollment', () => {
  it('is a no-op success when MFA is already enabled', async () => {
    prismaMock.user.findUniqueOrThrow.mockResolvedValue({
      email: EMAIL,
      mfaEnabled: true,
      mfaSecret: 'JBSWY3DPEHPK3PXP',
    })
    await expect(verifyEnrollment(USER_ID, '000000')).resolves.toBe(true)
    expect(prismaMock.user.update).not.toHaveBeenCalled()
  })

  it('returns false when the user has no pending secret', async () => {
    prismaMock.user.findUniqueOrThrow.mockResolvedValue({
      email: EMAIL,
      mfaEnabled: false,
      mfaSecret: null,
    })
    await expect(verifyEnrollment(USER_ID, '123456')).resolves.toBe(false)
    expect(prismaMock.user.update).not.toHaveBeenCalled()
  })

  it('rejects an invalid TOTP code', async () => {
    const secret = new OTPAuth.Secret({ size: 20 }).base32
    prismaMock.user.findUniqueOrThrow.mockResolvedValue({
      email: EMAIL,
      mfaEnabled: false,
      mfaSecret: secret,
    })

    await expect(verifyEnrollment(USER_ID, '000000')).resolves.toBe(false)
    expect(prismaMock.user.update).not.toHaveBeenCalled()
  })

  it('accepts a valid TOTP and flips mfaEnabled to true', async () => {
    const secret = new OTPAuth.Secret({ size: 20 }).base32
    prismaMock.user.findUniqueOrThrow.mockResolvedValue({
      email: EMAIL,
      mfaEnabled: false,
      mfaSecret: secret,
    })
    prismaMock.user.update.mockResolvedValue({})

    const code = currentTotpFor(secret)
    await expect(verifyEnrollment(USER_ID, code)).resolves.toBe(true)

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: USER_ID },
      data: { mfaEnabled: true },
    })
  })

  it('tolerates whitespace inside the submitted code', async () => {
    const secret = new OTPAuth.Secret({ size: 20 }).base32
    prismaMock.user.findUniqueOrThrow.mockResolvedValue({
      email: EMAIL,
      mfaEnabled: false,
      mfaSecret: secret,
    })
    prismaMock.user.update.mockResolvedValue({})

    const code = currentTotpFor(secret)
    const spaced = `${code.slice(0, 3)} ${code.slice(3)}`

    await expect(verifyEnrollment(USER_ID, spaced)).resolves.toBe(true)
  })
})

describe('verifyChallenge', () => {
  it('returns true (no challenge needed) when MFA is disabled', async () => {
    prismaMock.user.findUniqueOrThrow.mockResolvedValue({
      email: EMAIL,
      mfaEnabled: false,
      mfaSecret: null,
    })
    await expect(verifyChallenge(USER_ID, '000000')).resolves.toBe(true)
  })

  it('returns true (no challenge needed) when secret is missing even if flag is on', async () => {
    prismaMock.user.findUniqueOrThrow.mockResolvedValue({
      email: EMAIL,
      mfaEnabled: true,
      mfaSecret: null,
    })
    await expect(verifyChallenge(USER_ID, '000000')).resolves.toBe(true)
  })

  it('rejects an invalid code when MFA is enabled', async () => {
    const secret = new OTPAuth.Secret({ size: 20 }).base32
    prismaMock.user.findUniqueOrThrow.mockResolvedValue({
      email: EMAIL,
      mfaEnabled: true,
      mfaSecret: secret,
    })
    await expect(verifyChallenge(USER_ID, '000000')).resolves.toBe(false)
  })

  it('accepts a valid code when MFA is enabled', async () => {
    const secret = new OTPAuth.Secret({ size: 20 }).base32
    prismaMock.user.findUniqueOrThrow.mockResolvedValue({
      email: EMAIL,
      mfaEnabled: true,
      mfaSecret: secret,
    })
    await expect(verifyChallenge(USER_ID, currentTotpFor(secret))).resolves.toBe(true)
  })
})

describe('disable', () => {
  it('is a no-op when MFA was never enabled', async () => {
    prismaMock.user.findUniqueOrThrow.mockResolvedValue({
      email: EMAIL,
      mfaEnabled: false,
      mfaSecret: null,
    })
    await disable(USER_ID)
    expect(prismaMock.user.update).not.toHaveBeenCalled()
  })

  it('clears mfaEnabled and mfaSecret when no current code is required', async () => {
    prismaMock.user.findUniqueOrThrow.mockResolvedValue({
      email: EMAIL,
      mfaEnabled: true,
      mfaSecret: 'JBSWY3DPEHPK3PXP',
    })
    prismaMock.user.update.mockResolvedValue({})

    await disable(USER_ID)

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: USER_ID },
      data: { mfaEnabled: false, mfaSecret: null },
    })
  })

  it('rejects an invalid TOTP when currentCode is supplied', async () => {
    const secret = new OTPAuth.Secret({ size: 20 }).base32
    prismaMock.user.findUniqueOrThrow.mockResolvedValue({
      email: EMAIL,
      mfaEnabled: true,
      mfaSecret: secret,
    })

    await expect(disable(USER_ID, '000000')).rejects.toThrow(/Invalid TOTP/)
    expect(prismaMock.user.update).not.toHaveBeenCalled()
  })

  it('disables MFA when supplied currentCode is valid', async () => {
    const secret = new OTPAuth.Secret({ size: 20 }).base32
    prismaMock.user.findUniqueOrThrow.mockResolvedValue({
      email: EMAIL,
      mfaEnabled: true,
      mfaSecret: secret,
    })
    prismaMock.user.update.mockResolvedValue({})

    await disable(USER_ID, currentTotpFor(secret))

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: USER_ID },
      data: { mfaEnabled: false, mfaSecret: null },
    })
  })
})
