import { describe, expect, it } from 'vitest'
import { findReviewFlags } from './anomalies'
import { getOverview, payrollRows, type PayrollRow } from './data'

const source = payrollRows[0]

function row(index: number, week: number, hours: number, name = 'Test Worker'): PayrollRow {
  const weekDate = new Date(Date.UTC(2025, 0, 4 + 7 * week))
  return {
    ...source,
    rowNumber: 10000 + index,
    employeeId: 'test-worker',
    employeeName: name,
    weekDate,
    weekEnding: `${weekDate.getUTCMonth() + 1}/${weekDate.getUTCDate()}/${weekDate.getUTCFullYear()}`,
    standardHours: [hours / 5, hours / 5, hours / 5, hours / 5, hours / 5, 0, 0],
    overtimeHours: [0, 0, 0, 0, 0, 0, 0],
    totalStandardHours: hours,
    totalOvertimeHours: 0,
    totalHours: hours,
    standardRate: 30,
    overtimeRate: 45,
    benefitsRate: 10,
  }
}

describe('payroll reporting data', () => {
  it('loads the complete local CSV and sums reported hours', () => {
    const summary = getOverview(payrollRows)
    expect(summary.records).toBe(263)
    expect(summary.employees).toBe(23)
    expect(summary.totalHours).toBeCloseTo(9956.8)
  })

  it('uses five distinct other weeks for a standard-deviation cue', () => {
    const records = [...Array.from({ length: 5 }, (_, index) => row(index, index, 40)), row(5, 5, 55)]
    const flags = findReviewFlags(records)
    expect(flags.some((flag) => flag.row.rowNumber === 10005 && flag.title === 'Unusual weekly hours')).toBe(true)
  })

  it('does not treat split records in one week as five comparison weeks', () => {
    const records = [...Array.from({ length: 5 }, (_, index) => row(index, 0, 40)), row(5, 0, 55)]
    expect(findReviewFlags(records).some((flag) => flag.title === 'Unusual weekly hours')).toBe(false)
  })

  it('describes tied employee names without inventing a usual name', () => {
    const flags = findReviewFlags([row(0, 0, 40, 'Alex One'), row(1, 1, 40, 'Alex Two')])
    expect(flags.filter((flag) => flag.title === 'Conflicting names for employee ID')).toHaveLength(2)
    expect(flags.every((flag) => !flag.reason.includes('Most records'))).toBe(true)
  })
})
