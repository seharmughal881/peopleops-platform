import { describe, it, expect } from 'vitest'
import { computeAttendanceTotals } from './overtime'

function at(h: number, m = 0): Date {
  return new Date(Date.UTC(2026, 4, 25, h, m, 0))
}

describe('computeAttendanceTotals', () => {
  it('break liya: 11 AM → 8 PM with 1hr regular break = 8h net, 0 overtime', () => {
    const t = computeAttendanceTotals(at(11), at(20), [
      { startedAt: at(15), endedAt: at(16), type: 'regular' },
    ])
    expect(t.netHours).toBe(8)
    expect(t.extraHours).toBe(0)
    expect(t.overtimeHours).toBe(0)
  })

  it('break nahi liya: 11 AM → 7 PM no break = 8h net, 0 overtime', () => {
    const t = computeAttendanceTotals(at(11), at(19), [])
    expect(t.netHours).toBe(8)
    expect(t.overtimeHours).toBe(0)
  })

  it('1hr extra (within grace): 11 AM → 9 PM with 1hr break = 9h net, 0 overtime', () => {
    const t = computeAttendanceTotals(at(11), at(21), [
      { startedAt: at(15), endedAt: at(16), type: 'regular' },
    ])
    expect(t.netHours).toBe(9)
    expect(t.extraHours).toBe(1)
    expect(t.overtimeHours).toBe(0) // grace
  })

  it('2hr extra: 11 AM → 10 PM with 1hr break = 10h net, 1h overtime', () => {
    const t = computeAttendanceTotals(at(11), at(22), [
      { startedAt: at(15), endedAt: at(16), type: 'regular' },
    ])
    expect(t.netHours).toBe(10)
    expect(t.extraHours).toBe(2)
    expect(t.overtimeHours).toBe(1)
  })

  it('3hr extra: 11 AM → 11 PM with 1hr break = 11h net, 2h overtime', () => {
    const t = computeAttendanceTotals(at(11), at(23), [
      { startedAt: at(15), endedAt: at(16), type: 'regular' },
    ])
    expect(t.netHours).toBe(11)
    expect(t.overtimeHours).toBe(2)
  })

  it('namaz break does NOT deduct from net hours', () => {
    // 11 AM → 7:20 PM = 8h20m gross. 20 min namaz break only.
    // Without exemption: net = 8h. With exemption: net = 8h20m.
    const t = computeAttendanceTotals(at(11), at(19, 20), [
      { startedAt: at(13), endedAt: at(13, 20), type: 'namaz' },
    ])
    expect(t.netHours).toBeCloseTo(8.333, 2)
    expect(t.namazBreakMs).toBe(20 * 60 * 1000)
    expect(t.regularBreakMs).toBe(0)
  })

  it('multiple namaz breaks all exempt', () => {
    // 11 AM → 8 PM = 9h gross. Two 15-min namaz breaks. No regular break.
    // Net should remain 9h (namaz not deducted) → 1h extra → 0 overtime (grace).
    const t = computeAttendanceTotals(at(11), at(20), [
      { startedAt: at(13), endedAt: at(13, 15), type: 'namaz' },
      { startedAt: at(17), endedAt: at(17, 15), type: 'namaz' },
    ])
    expect(t.netHours).toBe(9)
    expect(t.overtimeHours).toBe(0)
  })

  it('mixed: 1hr regular break + 20min namaz, long day', () => {
    // 9 AM → 8 PM = 11h gross. 1h regular (deducts) + 20min namaz (exempt).
    // Net = 10h → 2h extra → 1h overtime.
    const t = computeAttendanceTotals(at(9), at(20), [
      { startedAt: at(13), endedAt: at(14), type: 'regular' },
      { startedAt: at(17), endedAt: at(17, 20), type: 'namaz' },
    ])
    expect(t.netHours).toBe(10)
    expect(t.overtimeHours).toBe(1)
  })

  it('short day (left early): no negative overtime', () => {
    // 6 hours of work
    const t = computeAttendanceTotals(at(11), at(17), [])
    expect(t.netHours).toBe(6)
    expect(t.extraHours).toBe(0)
    expect(t.overtimeHours).toBe(0)
  })

  it('open break (no endedAt) uses clockOut as fallback', () => {
    // Employee on break at clock-out time. Should still count the break ms.
    const t = computeAttendanceTotals(at(11), at(20), [
      { startedAt: at(19), endedAt: null, type: 'regular' },
    ])
    // 9h gross - 1h open break = 8h net
    expect(t.netHours).toBe(8)
  })
})
