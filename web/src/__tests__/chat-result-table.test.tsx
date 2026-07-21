/**
 * Tests for the /chat result-table renderer: row extraction from skill
 * result payloads and the tabular markup (count header, humanized column
 * headers, URL cells as links).
 */

import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ResultTable, extractRows } from '../components/ResultTable'

describe('extractRows', () => {
  it('accepts a bare array of objects', () => {
    const rows = extractRows([{ a: 1 }, { a: 2 }])
    expect(rows).toHaveLength(2)
  })

  it('pulls the first array-of-objects value out of a wrapper object', () => {
    const rows = extractRows({
      totalFound: 2,
      companies: [{ name: 'Acme' }, { name: 'Globex' }],
    })
    expect(rows.map((r) => r.name)).toEqual(['Acme', 'Globex'])
  })

  it('returns empty for scalars, empty arrays, and arrays of scalars', () => {
    expect(extractRows('hello')).toHaveLength(0)
    expect(extractRows([])).toHaveLength(0)
    expect(extractRows([1, 2, 3])).toHaveLength(0)
    expect(extractRows({ note: 'no rows here' })).toHaveLength(0)
  })
})

describe('ResultTable', () => {
  const rows = [
    { company_name: 'Acme', website: 'https://acme.com', headcount: 120 },
    { company_name: 'Globex', website: 'https://globex.io', headcount: 88 },
  ]

  it('renders the rows · columns count header', () => {
    const html = renderToStaticMarkup(<ResultTable rows={rows} />)
    expect(html).toContain('2 rows · 3 columns')
  })

  it('humanizes column headers', () => {
    const html = renderToStaticMarkup(<ResultTable rows={rows} />)
    expect(html).toContain('Company Name')
    expect(html).toContain('Website')
  })

  it('renders URL cells as links', () => {
    const html = renderToStaticMarkup(<ResultTable rows={rows} />)
    expect(html).toContain('href="https://acme.com"')
  })

  it('unions columns across rows with different keys', () => {
    const html = renderToStaticMarkup(
      <ResultTable rows={[{ a: 1 }, { b: 2 }]} />,
    )
    expect(html).toContain('2 rows · 2 columns')
  })

  it('renders nothing for an empty row set', () => {
    expect(renderToStaticMarkup(<ResultTable rows={[]} />)).toBe('')
  })
})
