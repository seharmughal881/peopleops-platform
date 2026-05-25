'use client'

import { useEffect, useState, useTransition } from 'react'
import { clockIn, clockOut, startBreak, endBreak } from '@/lib/modules/attendance/actions'
import { Button } from '@/lib/ui/Button'
import { toastError, toastSuccess } from '@/lib/ui/toast'

function captureGeolocation(timeoutMs = 4000): Promise<{ lat: number; lng: number } | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return Promise.resolve(null)
  return new Promise((resolve) => {
    let settled = false
    const timer = setTimeout(() => { if (!settled) { settled = true; resolve(null) } }, timeoutMs)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      },
      () => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve(null)
      },
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 30_000 },
    )
  })
}

function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`
}

export function ClockButtons({
  isClockedIn,
  activeBreakStartedAt,
  activeBreakType,
}: {
  isClockedIn: boolean
  activeBreakStartedAt?: string | null
  activeBreakType?: 'regular' | 'namaz' | null
}) {
  const [pending, startTransition] = useTransition()
  const [geoNote, setGeoNote] = useState<string | null>(null)
  const [breakElapsed, setBreakElapsed] = useState<string | null>(null)

  useEffect(() => {
    if (!activeBreakStartedAt) { setBreakElapsed(null); return }
    const start = new Date(activeBreakStartedAt).getTime()
    const tick = () => setBreakElapsed(formatDuration(Date.now() - start))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [activeBreakStartedAt])

  async function onClockIn() {
    setGeoNote('Locating…')
    const geo = await captureGeolocation()
    setGeoNote(geo ? `Captured location (±lat ${geo.lat.toFixed(3)}, lng ${geo.lng.toFixed(3)})` : 'Location not shared (continuing without)')
    const fd = new FormData()
    fd.set('source', 'web')
    if (geo) {
      fd.set('lat', String(geo.lat))
      fd.set('lng', String(geo.lng))
    }
    startTransition(async () => {
      const r = await clockIn(fd)
      if (r && 'error' in r && r.error) toastError(r.error)
      else toastSuccess('Clocked in')
    })
  }

  function onClockOut() {
    setGeoNote(null)
    startTransition(async () => {
      const r = await clockOut()
      if (r && 'error' in r && r.error) toastError(r.error)
      else toastSuccess('Clocked out')
    })
  }

  function onStartBreak() {
    startTransition(async () => {
      const r = await startBreak('regular')
      if (r && 'error' in r && r.error) toastError(r.error)
      else toastSuccess('Break started')
    })
  }

  function onStartNamazBreak() {
    startTransition(async () => {
      const r = await startBreak('namaz')
      if (r && 'error' in r && r.error) toastError(r.error)
      else toastSuccess('Namaz break started')
    })
  }

  function onEndBreak() {
    startTransition(async () => {
      const r = await endBreak()
      if (r && 'error' in r && r.error) toastError(r.error)
      else toastSuccess('Break ended')
    })
  }

  const onBreak = !!activeBreakStartedAt
  const isNamaz = activeBreakType === 'namaz'

  return (
    <div className="space-y-3">
      {onBreak && (
        <div
          className={
            isNamaz
              ? 'flex items-center gap-3 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 dark:border-emerald-700/60 dark:bg-emerald-950/40'
              : 'flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-700/60 dark:bg-amber-950/40'
          }
        >
          <span className="text-2xl" aria-hidden>{isNamaz ? '🕌' : '☕'}</span>
          <div className="flex-1">
            <p
              className={
                isNamaz
                  ? 'text-sm font-medium text-emerald-900 dark:text-emerald-100'
                  : 'text-sm font-medium text-amber-900 dark:text-amber-100'
              }
            >
              {isNamaz ? 'On namaz break' : 'On break'}
            </p>
            <p
              className={
                isNamaz
                  ? 'font-mono text-2xl font-semibold tabular-nums text-emerald-900 dark:text-emerald-50'
                  : 'font-mono text-2xl font-semibold tabular-nums text-amber-900 dark:text-amber-50'
              }
            >
              {breakElapsed ?? '0s'}
            </p>
          </div>
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        <Button onClick={onClockIn} disabled={pending || isClockedIn}>
          Clock in
        </Button>
        <Button variant="secondary" onClick={onClockOut} disabled={pending || !isClockedIn}>
          Clock out
        </Button>
        {isClockedIn && !onBreak && (
          <>
            <Button variant="outline" onClick={onStartBreak} disabled={pending}>
              Start break
            </Button>
            <Button variant="outline" onClick={onStartNamazBreak} disabled={pending}>
              🕌 Start namaz break
            </Button>
          </>
        )}
        {isClockedIn && onBreak && (
          <Button variant="primary" onClick={onEndBreak} disabled={pending}>
            End {isNamaz ? 'namaz break' : 'break'} {breakElapsed && <span className="ml-1 tabular-nums opacity-90">({breakElapsed})</span>}
          </Button>
        )}
      </div>
      {geoNote && <p className="text-xs text-foreground-muted">{geoNote}</p>}
    </div>
  )
}
