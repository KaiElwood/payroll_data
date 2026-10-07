import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { findReviewFlags } from './anomalies'
import { payrollRows } from './data'
import Review from './Review'

describe('review source', () => {
  it('derives flags from the active dataset', () => {
    const importedRows = payrollRows.map((row) => ({ ...row, rowNumber: row.rowNumber + 1000 }))
    const count = findReviewFlags(importedRows).length
    expect(count).toBeGreaterThan(0)
    const html = renderToStaticMarkup(<Review rows={importedRows} allRows={importedRows} />)
    expect(html).toContain(`${count} flags`)
  })
})
