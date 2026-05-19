// Minimal RFC 4180 CSV writer.
export function csvEscape(v: unknown): string {
  if (v == null) return ''
  let s = String(v)
  if (s.includes('"')) s = s.replace(/"/g, '""')
  if (/[",\r\n]/.test(s)) s = `"${s}"`
  return s
}

export function csvRow(values: unknown[]): string {
  return values.map(csvEscape).join(',')
}

export function buildCsv(header: string[], rows: unknown[][]): string {
  const lines = [csvRow(header), ...rows.map(csvRow)]
  return lines.join('\r\n') + '\r\n'
}
