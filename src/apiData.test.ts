import { describe, expect, it } from 'vitest'
import { normalizeApiRows } from './apiData'
import { payrollRows } from './csvData'

describe('local API row adapter', () => {
  it('preserves sub-cent wages and the React date contract', () => {
    const { weekDate: _weekDate, ...source } = payrollRows[0]
    const [row] = normalizeApiRows({ rows: [{ ...source, weekEnding: '2025-03-01', batchId: 1, sourceRow: 2 }] })
    expect(row.weekEnding).toBe('03/01/2025')
    expect(row.weekDate.toISOString()).toBe('2025-03-01T00:00:00.000Z')
    expect(row.rowNumber).toBe(2)
    expect(row.cashWages).toBe(1163.172)
  })

  it('rejects an invalid API date', () => {
    expect(() => normalizeApiRows({ rows: [{ weekEnding: '2025-02-30' }] })).toThrow('invalid week date')
  })
})
