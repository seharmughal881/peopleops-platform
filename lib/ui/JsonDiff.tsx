import type { ReactNode } from 'react'

interface JsonDiffProps {
  before: string | null
  after: string | null
}

type ParsedValue = unknown
type ParseResult = { ok: true; value: ParsedValue } | { ok: false; raw: string }

function parse(json: string | null): ParseResult | null {
  if (json === null || json === '') return null
  try {
    return { ok: true, value: JSON.parse(json) }
  } catch {
    return { ok: false, raw: json }
  }
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function valueEquals(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a !== typeof b) return false
  try {
    return JSON.stringify(a) === JSON.stringify(b)
  } catch {
    return false
  }
}

function renderValue(v: unknown): ReactNode {
  if (v === undefined) return <span className="text-foreground-subtle">—</span>
  if (v === null) return <code className="font-mono text-[12px]">null</code>
  if (typeof v === 'string') return <code className="font-mono text-[12px]">&quot;{v}&quot;</code>
  if (typeof v === 'number' || typeof v === 'boolean')
    return <code className="font-mono text-[12px]">{String(v)}</code>
  return (
    <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-snug text-foreground">
      {JSON.stringify(v, null, 2)}
    </pre>
  )
}

export function JsonDiff({ before, after }: JsonDiffProps) {
  const b = parse(before)
  const a = parse(after)

  if (!b && !a) {
    return <p className="text-sm text-foreground-muted">No before/after payload recorded.</p>
  }

  // Either side failed to parse → show raw side-by-side.
  if ((b && !b.ok) || (a && !a.ok)) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <RawPanel title="Before" raw={b && !b.ok ? b.raw : b && b.ok ? JSON.stringify(b.value, null, 2) : null} />
        <RawPanel title="After" raw={a && !a.ok ? a.raw : a && a.ok ? JSON.stringify(a.value, null, 2) : null} />
      </div>
    )
  }

  const beforeVal = b && b.ok ? b.value : undefined
  const afterVal = a && a.ok ? a.value : undefined

  // Both top-level objects → field-by-field diff.
  if (isPlainObject(beforeVal) && isPlainObject(afterVal)) {
    const keys = Array.from(new Set([...Object.keys(beforeVal), ...Object.keys(afterVal)])).sort()
    return (
      <div className="overflow-hidden rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface-muted text-left text-[11px] uppercase tracking-wider text-foreground-subtle">
            <tr>
              <th className="px-3 py-2 font-medium">Field</th>
              <th className="px-3 py-2 font-medium">Before</th>
              <th className="px-3 py-2 font-medium">After</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {keys.map((k) => {
              const bv = (beforeVal as Record<string, unknown>)[k]
              const av = (afterVal as Record<string, unknown>)[k]
              const inBefore = k in beforeVal
              const inAfter = k in afterVal
              let state: 'unchanged' | 'added' | 'removed' | 'changed'
              if (!inBefore) state = 'added'
              else if (!inAfter) state = 'removed'
              else state = valueEquals(bv, av) ? 'unchanged' : 'changed'

              const beforeCell = (
                <td
                  className={
                    'px-3 py-2 align-top ' +
                    (state === 'removed' || state === 'changed'
                      ? 'bg-[color-mix(in_oklch,var(--danger,#dc2626)_8%,transparent)]'
                      : '')
                  }
                >
                  {inBefore ? renderValue(bv) : <span className="text-foreground-subtle">—</span>}
                </td>
              )
              const afterCell = (
                <td
                  className={
                    'px-3 py-2 align-top ' +
                    (state === 'added' || state === 'changed'
                      ? 'bg-[color-mix(in_oklch,var(--success,#16a34a)_8%,transparent)]'
                      : '')
                  }
                >
                  {inAfter ? renderValue(av) : <span className="text-foreground-subtle">—</span>}
                </td>
              )

              return (
                <tr key={k} className="text-foreground">
                  <td className="px-3 py-2 align-top">
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-[12px] text-foreground">{k}</code>
                      <StateBadge state={state} />
                    </div>
                  </td>
                  {beforeCell}
                  {afterCell}
                </tr>
              )
            })}
            {keys.length === 0 && (
              <tr>
                <td colSpan={3} className="px-3 py-6 text-center text-sm text-foreground-muted">
                  Both payloads are empty.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    )
  }

  // Non-object / one-sided → render side-by-side panels.
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <RawPanel
        title="Before"
        raw={beforeVal === undefined ? null : JSON.stringify(beforeVal, null, 2)}
      />
      <RawPanel
        title="After"
        raw={afterVal === undefined ? null : JSON.stringify(afterVal, null, 2)}
      />
    </div>
  )
}

function RawPanel({ title, raw }: { title: string; raw: string | null }) {
  return (
    <div className="rounded-md border border-border">
      <div className="border-b border-border bg-surface-muted px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider text-foreground-subtle">
        {title}
      </div>
      {raw === null ? (
        <p className="px-3 py-3 text-sm text-foreground-muted">—</p>
      ) : (
        <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words px-3 py-2 font-mono text-[11px] leading-snug text-foreground">
          {raw}
        </pre>
      )}
    </div>
  )
}

type DiffState = 'unchanged' | 'added' | 'removed' | 'changed'

function StateBadge({ state }: { state: DiffState }) {
  const styles: Record<DiffState, string> = {
    unchanged: 'border-border bg-surface text-foreground-subtle',
    added: 'border-[color-mix(in_oklch,var(--success,#16a34a)_30%,transparent)] bg-[color-mix(in_oklch,var(--success,#16a34a)_10%,transparent)] text-foreground',
    removed: 'border-[color-mix(in_oklch,var(--danger,#dc2626)_30%,transparent)] bg-[color-mix(in_oklch,var(--danger,#dc2626)_10%,transparent)] text-foreground',
    changed: 'border-[color-mix(in_oklch,var(--accent,#6366f1)_30%,transparent)] bg-[color-mix(in_oklch,var(--accent,#6366f1)_10%,transparent)] text-foreground',
  }
  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${styles[state]}`}
    >
      {state}
    </span>
  )
}
