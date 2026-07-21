/**
 * Tabular renderer for skill results with copy/download capabilities.
 */
import { useMemo, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export type Row = Record<string, unknown>

export function extractRows(data: unknown): Row[] {
  const isRowArray = (v: unknown): v is Row[] =>
    Array.isArray(v) &&
    v.length > 0 &&
    v.every((x) => x !== null && typeof x === 'object' && !Array.isArray(x))
  if (isRowArray(data)) return data
  if (data !== null && typeof data === 'object') {
    for (const v of Object.values(data as Record<string, unknown>)) {
      if (isRowArray(v)) return v
    }
  }
  return []
}

function columnsOf(rows: Row[]): string[] {
  const cols: string[] = []
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!cols.includes(key)) cols.push(key)
    }
  }
  return cols
}

function cellText(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

function isUrl(s: string): boolean {
  return s.startsWith('http://') || s.startsWith('https://')
}

function csvEscape(s: string): string {
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function humanizeHeader(key: string): string {
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function ResultTable({ rows, filename = 'results' }: { rows: Row[]; filename?: string }) {
  const columns = useMemo(() => columnsOf(rows), [rows])
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const tsv = [
      columns.join('\t'),
      ...rows.map((r) => columns.map((c) => cellText(r[c]).replace(/\t/g, ' ')).join('\t')),
    ].join('\n')
    try {
      await navigator.clipboard.writeText(tsv)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard unavailable — no-op.
    }
  }

  const handleDownload = () => {
    const csv = [
      columns.map(csvEscape).join(','),
      ...rows.map((r) => columns.map((c) => csvEscape(cellText(r[c]))).join(',')),
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (rows.length === 0) return null

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden" data-testid="result-table">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <span className="text-xs text-muted-foreground">
          {rows.length} row{rows.length === 1 ? '' : 's'} · {columns.length} column
          {columns.length === 1 ? '' : 's'}
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => void handleCopy()}
            title="Copy as TSV"
            className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-background transition-colors"
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            title="Download CSV"
            className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-background transition-colors"
          >
            Download
          </button>
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">#</TableHead>
            {columns.map((c) => (
              <TableHead key={c}>{humanizeHeader(c)}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={i}>
              <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
              {columns.map((c) => {
                const text = cellText(row[c])
                return (
                  <TableCell key={c} className="max-w-[280px] truncate" title={text}>
                    {isUrl(text) ? (
                      <a
                        href={text}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline underline-offset-2"
                      >
                        {text.replace(/^https?:\/\/(www\.)?/, '').slice(0, 40)}
                      </a>
                    ) : (
                      text
                    )}
                  </TableCell>
                )
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
