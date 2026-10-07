import { getWeeklySummaries, type PayrollRow } from './data'

export interface EmployeeWeek {
  weekEnding: string
  weekDate: Date
  standardHours: number
  overtimeHours: number
  totalHours: number
  cashWages: number
  records: number
}

export function getEmployeeWeeks(rows: PayrollRow[]): EmployeeWeek[] {
  return getWeeklySummaries(rows).map((week) => ({
    weekEnding: week.weekEnding,
    weekDate: week.weekDate,
    standardHours: week.totalHours - week.overtimeHours,
    overtimeHours: week.overtimeHours,
    totalHours: week.totalHours,
    cashWages: week.cashWages,
    records: week.records,
  }))
}

export interface WeekComparison {
  current: EmployeeWeek
  previous: EmployeeWeek
  hoursChange: number
  overtimeChange: number
  wagesChange: number
}

export function compareLatestWeeks(weeks: EmployeeWeek[]): WeekComparison | null {
  if (weeks.length < 2) return null
  const current = weeks.at(-1)!
  const previous = weeks.at(-2)!
  return {
    current,
    previous,
    hoursChange: current.totalHours - previous.totalHours,
    overtimeChange: current.overtimeHours - previous.overtimeHours,
    wagesChange: current.cashWages - previous.cashWages,
  }
}

export interface PeerWeek {
  weekEnding: string
  weekDate: Date
  employeeHours: number
  peerTotalHours: number
  peerAverage: number | null
  peerCount: number
}

export function comparePeerWeeks(rows: PayrollRow[], employeeId: string, occupation: string, level: string): PeerWeek[] {
  const cohort = rows.filter((row) => row.occupation === occupation && row.level === level)
  const employeeWeeks = getEmployeeWeeks(cohort.filter((row) => row.employeeId === employeeId))
  return employeeWeeks.map((week) => {
    const peerRows = cohort.filter((row) => row.weekEnding === week.weekEnding && row.employeeId !== employeeId)
    const peerHours = new Map<string, number>()
    for (const row of peerRows) peerHours.set(row.employeeId, (peerHours.get(row.employeeId) ?? 0) + row.totalHours)
    const peerCount = peerHours.size
    const peerTotalHours = [...peerHours.values()].reduce((sum, hours) => sum + hours, 0)
    return {
      weekEnding: week.weekEnding, weekDate: week.weekDate, employeeHours: week.totalHours,
      peerTotalHours, peerAverage: peerCount ? peerTotalHours / peerCount : null,
      peerCount,
    }
  })
}
