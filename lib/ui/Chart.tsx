import { type ReactNode } from 'react'

// Pure SVG chart primitives. Server-renderable, zero client JS.
// Optimized for read-mostly reports: no hover/animation.

type Point = { label: string; value: number; tone?: ChartTone }

export type ChartTone = 'accent' | 'success' | 'warn' | 'danger' | 'info' | 'neutral'

const TONE_STROKE: Record<ChartTone, string> = {
  accent: 'stroke-[var(--accent)]',
  success: 'stroke-emerald-500',
  warn: 'stroke-amber-500',
  danger: 'stroke-rose-500',
  info: 'stroke-sky-500',
  neutral: 'stroke-foreground-subtle',
}
const TONE_FILL: Record<ChartTone, string> = {
  accent: 'fill-[var(--accent)]',
  success: 'fill-emerald-500',
  warn: 'fill-amber-500',
  danger: 'fill-rose-500',
  info: 'fill-sky-500',
  neutral: 'fill-foreground-subtle',
}

function fmt(n: number): string {
  if (n >= 1000) return `${Math.round(n / 100) / 10}k`
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

export function HBarChart({
  data,
  max,
  showValues = true,
  tone = 'accent',
  emptyLabel = 'No data',
}: {
  data: Point[]
  max?: number
  showValues?: boolean
  tone?: ChartTone
  emptyLabel?: string
}) {
  if (data.length === 0) return <EmptyChart label={emptyLabel} />
  const ceiling = max ?? Math.max(...data.map((d) => d.value), 1)
  return (
    <ul className="space-y-2.5">
      {data.map((d) => {
        const pct = ceiling > 0 ? (d.value / ceiling) * 100 : 0
        const t = d.tone ?? tone
        return (
          <li key={d.label} className="grid grid-cols-[8rem_1fr_3rem] items-center gap-3 text-sm">
            <span className="truncate text-foreground-muted" title={d.label}>{d.label}</span>
            <span className="relative h-2.5 overflow-hidden rounded-full bg-surface-muted">
              <span
                className={`absolute inset-y-0 left-0 rounded-full ${TONE_FILL[t]}`}
                style={{ width: `${pct}%` }}
              />
            </span>
            {showValues && (
              <span className="text-right font-semibold tabular-nums">{fmt(d.value)}</span>
            )}
          </li>
        )
      })}
    </ul>
  )
}

export function LineChart({
  points,
  height = 180,
  tone = 'accent',
  yLabel,
  emptyLabel = 'No data',
}: {
  points: Point[]
  height?: number
  tone?: ChartTone
  yLabel?: string
  emptyLabel?: string
}) {
  if (points.length === 0) return <EmptyChart label={emptyLabel} />
  const width = 600
  const padL = 40, padR = 12, padT = 12, padB = 28
  const plotW = width - padL - padR
  const plotH = height - padT - padB
  const maxV = Math.max(...points.map((p) => p.value), 1)
  const niceMax = Math.ceil(maxV * 1.1)
  const step = points.length > 1 ? plotW / (points.length - 1) : 0
  const x = (i: number) => padL + i * step
  const y = (v: number) => padT + plotH - (v / niceMax) * plotH
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p.value)}`).join(' ')
  const area = `${path} L${x(points.length - 1)},${padT + plotH} L${x(0)},${padT + plotH} Z`
  const gridSteps = 4
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label={yLabel ?? 'Trend'}>
      {[...Array(gridSteps + 1)].map((_, i) => {
        const gy = padT + (plotH / gridSteps) * i
        const v = niceMax - (niceMax / gridSteps) * i
        return (
          <g key={i}>
            <line x1={padL} y1={gy} x2={width - padR} y2={gy} className="stroke-border" strokeWidth={1} />
            <text x={padL - 6} y={gy + 3} textAnchor="end" className="fill-foreground-muted text-[10px]">{fmt(v)}</text>
          </g>
        )
      })}
      <path d={area} className={`${TONE_FILL[tone]} opacity-10`} />
      <path d={path} fill="none" className={TONE_STROKE[tone]} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.value)} r={2.5} className={TONE_FILL[tone]} />
      ))}
      {points.map((p, i) => {
        // Skip labels on dense charts to avoid overlap
        const stride = Math.max(1, Math.ceil(points.length / 8))
        if (i % stride !== 0 && i !== points.length - 1) return null
        return (
          <text key={i} x={x(i)} y={height - 8} textAnchor="middle" className="fill-foreground-muted text-[10px]">
            {p.label}
          </text>
        )
      })}
    </svg>
  )
}

export function Donut({
  slices,
  size = 160,
  thickness = 22,
  centerLabel,
  centerSub,
  emptyLabel = 'No data',
}: {
  slices: Array<{ label: string; value: number; tone?: ChartTone }>
  size?: number
  thickness?: number
  centerLabel?: string
  centerSub?: string
  emptyLabel?: string
}) {
  const total = slices.reduce((s, x) => s + x.value, 0)
  if (total === 0) return <EmptyChart label={emptyLabel} />
  const r = size / 2 - thickness / 2 - 2
  const c = size / 2
  const circumference = 2 * Math.PI * r
  let offset = 0
  return (
    <div className="flex flex-wrap items-center gap-5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={centerLabel}>
        <circle cx={c} cy={c} r={r} fill="none" className="stroke-surface-muted" strokeWidth={thickness} />
        {slices.map((s, i) => {
          const frac = s.value / total
          const len = frac * circumference
          const dasharray = `${len} ${circumference - len}`
          const dashoffset = -offset
          offset += len
          const tone = s.tone ?? DONUT_PALETTE[i % DONUT_PALETTE.length]
          return (
            <circle
              key={s.label}
              cx={c}
              cy={c}
              r={r}
              fill="none"
              className={TONE_STROKE[tone]}
              strokeWidth={thickness}
              strokeDasharray={dasharray}
              strokeDashoffset={dashoffset}
              transform={`rotate(-90 ${c} ${c})`}
            />
          )
        })}
        {centerLabel && (
          <text x={c} y={c - 2} textAnchor="middle" className="fill-foreground text-lg font-semibold">
            {centerLabel}
          </text>
        )}
        {centerSub && (
          <text x={c} y={c + 14} textAnchor="middle" className="fill-foreground-muted text-[10px] uppercase tracking-wide">
            {centerSub}
          </text>
        )}
      </svg>
      <ul className="space-y-1.5 text-sm">
        {slices.map((s, i) => {
          const tone = s.tone ?? DONUT_PALETTE[i % DONUT_PALETTE.length]
          const pct = Math.round((s.value / total) * 100)
          return (
            <li key={s.label} className="flex items-center gap-2">
              <span className={`inline-block size-2.5 rounded-full ${TONE_FILL[tone]}`} aria-hidden />
              <span className="text-foreground-muted">{s.label}</span>
              <span className="ml-auto font-semibold tabular-nums">{s.value}</span>
              <span className="w-9 text-right text-foreground-subtle tabular-nums">{pct}%</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

const DONUT_PALETTE: ChartTone[] = ['accent', 'info', 'success', 'warn', 'danger', 'neutral']

export function Funnel({
  stages,
  emptyLabel = 'No candidates',
}: {
  stages: Array<{ label: string; value: number; conversion?: number | null }>
  emptyLabel?: string
}) {
  if (stages.length === 0 || stages[0].value === 0) return <EmptyChart label={emptyLabel} />
  const max = stages[0].value
  return (
    <ol className="space-y-1.5">
      {stages.map((s, i) => {
        const pct = max > 0 ? (s.value / max) * 100 : 0
        return (
          <li key={s.label}>
            <div className="mb-0.5 flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium">{s.label}</span>
              <span className="flex items-baseline gap-2 tabular-nums">
                {i > 0 && s.conversion != null && (
                  <span className="text-xs text-foreground-subtle">{s.conversion}% from prev</span>
                )}
                <span className="font-semibold">{s.value}</span>
              </span>
            </div>
            <div className="h-7 rounded-md bg-surface-muted">
              <div
                className="h-full rounded-md bg-[var(--accent)]/85"
                style={{ width: `${pct}%`, minWidth: s.value > 0 ? '2%' : 0 }}
              />
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-24 items-center justify-center rounded-md border border-dashed border-border text-sm text-foreground-muted">
      {label}
    </div>
  )
}

export function ChartLegend({ items }: { items: Array<{ label: string; tone: ChartTone }> }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground-muted">
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-1.5">
          <span className={`inline-block size-2 rounded-full ${TONE_FILL[it.tone]}`} aria-hidden />
          {it.label}
        </li>
      ))}
    </ul>
  )
}

export function ChartFrame({
  title,
  subtitle,
  action,
  children,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <div>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
          {subtitle && <p className="text-xs text-foreground-muted">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </div>
  )
}
