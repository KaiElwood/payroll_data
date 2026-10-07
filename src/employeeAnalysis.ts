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
