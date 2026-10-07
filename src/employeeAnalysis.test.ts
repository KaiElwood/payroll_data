import { describe, expect, it } from 'vitest'
import { compareLatestWeeks, comparePeerWeeks, getEmployeeWeeks, type EmployeeWeek } from './employeeAnalysis'
import { payrollRows } from './data'

describe('employee weekly analysis', () => {
  it('combines split rows for one employee and week', () => {
    const first = payrollRows[0]
    const second = { ...payrollRows[1], employeeId: first.employeeId, weekEnding: first.weekEnding, weekDate: first.weekDate }
    const rows = [first, second]
    const [week] = getEmployeeWeeks(rows)
    expect(week.records).toBe(rows.length)
    expect(week.totalHours).toBeCloseTo(rows.reduce((total, row) => total + row.totalHours, 0))
    expect(week.cashWages).toBeCloseTo(rows.reduce((total, row) => total + row.cashWages, 0))
  })

  it('compares the two latest reported weeks, including a gap', () => {
    const previous: EmployeeWeek = { weekEnding: '01/04/2026', weekDate: new Date('2026-01-04'), standardHours: 40, overtimeHours: 0, totalHours: 40, cashWages: 1000, records: 1 }
    const current: EmployeeWeek = { ...previous, weekEnding: '01/18/2026', weekDate: new Date('2026-01-18'), standardHours: 35, overtimeHours: 5, cashWages: 1200 }
    expect(compareLatestWeeks([previous, current])).toMatchObject({ current, previous, hoursChange: 0, overtimeChange: 5, wagesChange: 200 })
    expect(compareLatestWeeks([current])).toBeNull()
  })

  it('averages other employee-weeks in the same occupation and level', () => {
    const target = { ...payrollRows[0], totalHours: 40 }
    const peer = { ...target, employeeId: 'peer', totalHours: 30 }
    const splitPeer = { ...peer, totalHours: 10 }
    const otherLevel = { ...peer, employeeId: 'other-level', level: 'JOURNEYWORKER' as const, totalHours: 100 }
    const otherOccupation = { ...peer, employeeId: 'other-occupation', occupation: 'Other', totalHours: 100 }
    const [week] = comparePeerWeeks([target, peer, splitPeer, otherLevel, otherOccupation], target.employeeId, target.occupation, target.level)
    expect(week).toMatchObject({ employeeHours: 40, peerTotalHours: 40, peerCount: 1, peerAverage: 40 })
    expect(comparePeerWeeks([target], target.employeeId, target.occupation, target.level)[0].peerAverage).toBeNull()
  })
})
