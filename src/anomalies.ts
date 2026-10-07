import { days, type PayrollRow } from './data'
import { money, number } from './format'

export type FlagCategory = 'hours' | 'rates' | 'identity'
export interface ReviewFlag {
  id: string
  category: FlagCategory
  severity: 'high' | 'review'
  title: string
  reason: string
  observed: string
  row: PayrollRow
  sourceRows: PayrollRow[]
}

const DAY_LIMIT = 16
const WEEK_LIMIT = 60
const Z_LIMIT = 2.5
const MIN_PEER_WEEKS = 5

function mean(values: number[]) {
  return values.reduce((total, value) => total + value, 0) / values.length
}

function standardDeviation(values: number[]) {
  const average = mean(values)
  return Math.sqrt(mean(values.map((value) => (value - average) ** 2)))
}

function valuesFromOtherWeeks(peers: PayrollRow[], field: 'totalHours' | 'standardRate' | 'overtimeRate' | 'benefitsRate') {
  const weeks = new Map<string, number[]>()
  for (const peer of peers) weeks.set(peer.weekEnding, [...(weeks.get(peer.weekEnding) ?? []), peer[field]])
  return [...weeks.values()].map((values) => field === 'totalHours' ? values.reduce((total, value) => total + value, 0) : mean(values))
}

function scoreAgainstOtherWeeks(value: number, peers: number[], minDifference: number) {
  if (peers.length < MIN_PEER_WEEKS) return null
  const average = mean(peers)
  if (Math.abs(value - average) < minDifference) return null
  const deviation = standardDeviation(peers)
  const effectivelyConstant = deviation <= 1e-9 * Math.max(1, Math.abs(average))
  const score = effectivelyConstant ? Infinity : Math.abs(value - average) / deviation
  return score >= Z_LIMIT ? { average, score } : null
}

export function findReviewFlags(rows: PayrollRow[]): ReviewFlag[] {
  const byEmployee = new Map<string, PayrollRow[]>()
  for (const row of rows) byEmployee.set(row.employeeId, [...(byEmployee.get(row.employeeId) ?? []), row])
  const flags: ReviewFlag[] = []
  const add = (row: PayrollRow, category: FlagCategory, severity: ReviewFlag['severity'], title: string, observed: string, reason: string, sourceRows = [row]) => {
    flags.push({ id: `${row.rowNumber}-${title}`, row, sourceRows, category, severity, title, observed, reason })
  }

  for (const row of rows) {
    const employeeRows = byEmployee.get(row.employeeId)!
    const peers = employeeRows.filter((other) => other.weekEnding !== row.weekEnding)
    const sameWeekRows = employeeRows.filter((other) => other.weekEnding === row.weekEnding)
    const singleRecordWeek = sameWeekRows.length === 1
    if (sameWeekRows[0] === row) {
      const source = singleRecordWeek ? 'one record' : `${sameWeekRows.length} records (CSV rows ${sameWeekRows.map((item) => item.rowNumber).join(', ')})`
      const weekHours = sameWeekRows.reduce((total, item) => total + item.totalHours, 0)
      if (weekHours > WEEK_LIMIT) add(row, 'hours', 'high', 'Long reported week', `${number(weekHours, 1)} h`, `Combined hours from ${source} exceed the ${WEEK_LIMIT}-hour weekly review threshold.`, sameWeekRows)
      days.forEach((day, index) => {
        const hours = sameWeekRows.reduce((total, item) => total + item.standardHours[index] + item.overtimeHours[index], 0)
        if (hours > DAY_LIMIT) add(row, 'hours', 'high', `Long ${day.toUpperCase()} shift`, `${number(hours, 1)} h`, `Combined hours from ${source} exceed the ${DAY_LIMIT}-hour daily review threshold.`, sameWeekRows)
      })
    }
    if (singleRecordWeek && row.totalHours <= WEEK_LIMIT) {
      const result = scoreAgainstOtherWeeks(row.totalHours, valuesFromOtherWeeks(peers, 'totalHours'), 10)
      if (result) add(row, 'hours', 'review', 'Unusual weekly hours', `${number(row.totalHours, 1)} h`, `Other weeks average ${number(result.average, 1)} h. This week differs by ${result.score === Infinity ? 'more than a constant baseline' : `${number(result.score, 1)} standard deviations`}.`)
    }
    for (const [field, label, minimum] of [
      ['standardRate', 'Standard rate', 2],
      ['overtimeRate', 'Overtime rate', 2],
      ['benefitsRate', 'Benefits rate', 1],
    ] as const) {
      const result = singleRecordWeek ? scoreAgainstOtherWeeks(row[field], valuesFromOtherWeeks(peers, field), minimum) : null
      if (result && Math.abs(row[field] - result.average) >= result.average * 0.1) {
        add(row, 'rates', 'review', `Unusual ${label.toLowerCase()}`, money(row[field], 2), `Other weeks average ${money(result.average, 2)}. Difference is ${result.score === Infinity ? 'outside a constant baseline' : `${number(result.score, 1)} standard deviations`}.`)
      }
    }
  }

  for (const employeeRows of byEmployee.values()) {
    const nameCounts = new Map<string, number>()
    for (const row of employeeRows) nameCounts.set(row.employeeName, (nameCounts.get(row.employeeName) ?? 0) + 1)
    const [usualName, usualCount] = [...nameCounts.entries()].sort((a, b) => b[1] - a[1])[0]
    if (usualCount > employeeRows.length / 2) {
      for (const row of employeeRows) {
        if (row.employeeName !== usualName) add(row, 'identity', 'review', 'Name differs for employee ID', row.employeeName, `Most records for ID ${row.employeeId} use “${usualName}”. Confirm whether this is an expected name change.`)
      }
    } else if (nameCounts.size > 1) {
      const seen = new Set<string>()
      for (const row of employeeRows) {
        if (seen.has(row.employeeName)) continue
        seen.add(row.employeeName)
        add(row, 'identity', 'review', 'Conflicting names for employee ID', row.employeeName, `ID ${row.employeeId} has multiple names with no clear majority. Confirm the employee identity.`)
      }
    }
  }
  return flags.sort((a, b) => (a.severity === b.severity ? b.row.weekDate.getTime() - a.row.weekDate.getTime() : a.severity === 'high' ? -1 : 1))
}
