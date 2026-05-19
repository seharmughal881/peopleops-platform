import { describe, expect, it } from 'vitest'
import { hasPermission, can, assertCan } from './rbac'

describe('hasPermission', () => {
  it('returns true when user has the super wildcard "*"', () => {
    expect(hasPermission(['*'], 'leave:approve')).toBe(true)
    expect(hasPermission(['*'], 'payroll:run')).toBe(true)
  })

  it('returns true on exact permission match', () => {
    expect(hasPermission(['leave:approve'], 'leave:approve')).toBe(true)
  })

  it('returns true when user has the resource-level wildcard', () => {
    expect(hasPermission(['leave:*'], 'leave:approve')).toBe(true)
    expect(hasPermission(['leave:*'], 'leave:read')).toBe(true)
  })

  it('returns false when required permission is for a different resource', () => {
    expect(hasPermission(['leave:*'], 'payroll:run')).toBe(false)
  })

  it('returns false when required action differs and no wildcard is present', () => {
    expect(hasPermission(['leave:read'], 'leave:approve')).toBe(false)
  })

  it('returns false for an empty permission list', () => {
    expect(hasPermission([], 'leave:approve')).toBe(false)
  })

  it('is case-sensitive', () => {
    expect(hasPermission(['Leave:Approve'], 'leave:approve')).toBe(false)
  })
})

describe('can', () => {
  it('returns true when all required permissions are held', () => {
    expect(can(['leave:approve', 'leave:read'], 'leave:approve', 'leave:read')).toBe(true)
  })

  it('returns false if any required permission is missing', () => {
    expect(can(['leave:approve'], 'leave:approve', 'payroll:run')).toBe(false)
  })

  it('returns true vacuously when no permissions are required', () => {
    expect(can(['leave:approve'])).toBe(true)
  })

  it('honors wildcards across multiple required permissions', () => {
    expect(can(['*'], 'leave:approve', 'payroll:run', 'employee:write')).toBe(true)
    expect(can(['leave:*', 'payroll:*'], 'leave:approve', 'payroll:run')).toBe(true)
  })
})

describe('assertCan', () => {
  it('does not throw when permission is held', () => {
    expect(() => assertCan(['leave:approve'], 'leave:approve')).not.toThrow()
  })

  it('does not throw when permission is granted by wildcard', () => {
    expect(() => assertCan(['*'], 'anything:goes')).not.toThrow()
  })

  it('throws Forbidden with the missing permission name when denied', () => {
    expect(() => assertCan(['leave:read'], 'leave:approve')).toThrow(
      /Forbidden.*leave:approve/,
    )
  })

  it('throws on empty permissions list', () => {
    expect(() => assertCan([], 'leave:approve')).toThrow(/Forbidden/)
  })
})
