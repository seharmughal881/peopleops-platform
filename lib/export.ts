import 'server-only'
import * as XLSX from 'xlsx'

type Cell = string | number | boolean | Date | null | undefined

export interface ExportColumn<T> {
  key: string
  header: string
  value: (row: T) => Cell
}

function formatCell(v: Cell): string {
  if (v === null || v === undefined) return ''
  if (v instanceof Date) return v.toISOString()
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  return String(v)
}

function escapeCsv(s: string): string {
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export function rowsToCsv<T>(rows: T[], columns: ExportColumn<T>[]): string {
  const header = columns.map((c) => escapeCsv(c.header)).join(',')
  const body = rows
    .map((row) =>
      columns.map((c) => escapeCsv(formatCell(c.value(row)))).join(','),
    )
    .join('\n')
  // Prepend BOM so Excel detects UTF-8 correctly
  return `﻿${header}\n${body}\n`
}

export function csvResponse(csv: string, filename: string): Response {
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${sanitizeFilename(filename)}"`,
      'Cache-Control': 'no-store',
    },
  })
}

export function rowsToXlsxBuffer<T>(
  rows: T[],
  columns: ExportColumn<T>[],
  sheetName = 'Sheet1',
): Buffer {
  const data = rows.map((row) => {
    const obj: Record<string, Cell> = {}
    for (const c of columns) obj[c.header] = c.value(row)
    return obj
  })
  const ws = XLSX.utils.json_to_sheet(data, {
    header: columns.map((c) => c.header),
  })
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

export function xlsxResponse(buffer: Buffer, filename: string): Response {
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${sanitizeFilename(filename)}"`,
      'Cache-Control': 'no-store',
    },
  })
}

export function pdfResponse(buffer: Buffer, filename: string): Response {
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${sanitizeFilename(filename)}"`,
      'Cache-Control': 'no-store',
    },
  })
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_')
}
