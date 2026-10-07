import Papa from 'papaparse'
import csvText from '../payroll_data (3).csv?raw'

export const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
export type WorkerLevel = 'APPRENTICE' | 'JOURNEYWORKER'

export interface PayrollRow {
  rowNumber: number
  employeeId: string
  employeeName: string
  level: WorkerLevel
  occupation: string
  weekEnding: string
  weekDate: Date
  standardHours: number[]
  overtimeHours: number[]
  totalStandardHours: number
  totalOvertimeHours: number
  totalHours: number
  standardRate: number
  overtimeRate: number
  benefitsRate: number
  cashWages: number
  estimatedBenefits: number
}

const requiredColumns = [
  'employee_name', 'employee_id', 'level', 'occupation', 'week_ending',
  ...days.flatMap((day) => [`${day}_st_hours`, `${day}_ot_hours`]),
  'standard_rate', 'overtime_rate', 'benefits_rate',
]

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0)
}

function parseNonnegative(value: string | undefined, field: string, rowNumber: number) {
  const parsed = Number(value)
  if (value === undefined || value.trim() === '' || !Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Invalid ${field} on CSV row ${rowNumber}`)
  }
  return parsed
}

function parseWeek(value: string, rowNumber: number) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value)
  if (!match) throw new Error(`Invalid week_ending on CSV row ${rowNumber}`)
  const month = Number(match[1])
  const day = Number(match[2])
  const year = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error(`Invalid week_ending on CSV row ${rowNumber}`)
  }
  return date
}

export function parsePayroll(text: string): PayrollRow[] {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.trim().replace(/^\uFEFF/, ''),
  })
  if (result.errors.length) throw new Error(`CSV parse error: ${result.errors[0].message}`)
  const missing = requiredColumns.filter((column) => !result.meta.fields?.includes(column))
  if (missing.length) throw new Error(`Missing CSV columns: ${missing.join(', ')}`)

  return result.data.map((raw, index) => {
    const rowNumber = index + 2
    const employeeId = raw.employee_id?.trim()
    const employeeName = raw.employee_name?.trim()
    const occupation = raw.occupation?.trim()
    const level = raw.level?.trim()
    if (!employeeId || !employeeName || !occupation) throw new Error(`Missing identity on CSV row ${rowNumber}`)
    if (level !== 'APPRENTICE' && level !== 'JOURNEYWORKER') {
      throw new Error(`Invalid level on CSV row ${rowNumber}`)
    }
    const standardHours = days.map((day) => parseNonnegative(raw[`${day}_st_hours`], `${day}_st_hours`, rowNumber))
    const overtimeHours = days.map((day) => parseNonnegative(raw[`${day}_ot_hours`], `${day}_ot_hours`, rowNumber))
    const standardRate = parseNonnegative(raw.standard_rate, 'standard_rate', rowNumber)
    const overtimeRate = parseNonnegative(raw.overtime_rate, 'overtime_rate', rowNumber)
    const benefitsRate = parseNonnegative(raw.benefits_rate, 'benefits_rate', rowNumber)
    const totalStandardHours = sum(standardHours)
    const totalOvertimeHours = sum(overtimeHours)
    const totalHours = totalStandardHours + totalOvertimeHours
    return {
      rowNumber, employeeId, employeeName, level, occupation,
      weekEnding: raw.week_ending.trim(),
      weekDate: parseWeek(raw.week_ending.trim(), rowNumber),
      standardHours, overtimeHours, totalStandardHours, totalOvertimeHours, totalHours,
      standardRate, overtimeRate, benefitsRate,
      cashWages: totalStandardHours * standardRate + totalOvertimeHours * overtimeRate,
      estimatedBenefits: totalHours * benefitsRate,
    }
  })
}

export const payrollRows = parsePayroll(csvText)

export interface Overview {
  employees: number
  records: number
  totalHours: number
  overtimeHours: number
  apprenticeHours: number
  apprenticeShare: number
  cashWages: number
  estimatedBenefits: number
  averageStandardRate: number
  averageBenefitsRate: number
}

export function getOverview(rows: PayrollRow[]): Overview {
  const totalHours = sum(rows.map((row) => row.totalHours))
  const apprenticeHours = sum(rows.filter((row) => row.level === 'APPRENTICE').map((row) => row.totalHours))
  return {
    employees: new Set(rows.map((row) => row.employeeId)).size,
    records: rows.length,
    totalHours,
    overtimeHours: sum(rows.map((row) => row.totalOvertimeHours)),
    apprenticeHours,
    apprenticeShare: totalHours ? apprenticeHours / totalHours : 0,
    cashWages: sum(rows.map((row) => row.cashWages)),
    estimatedBenefits: sum(rows.map((row) => row.estimatedBenefits)),
    averageStandardRate: rows.length ? sum(rows.map((row) => row.standardRate)) / rows.length : 0,
    averageBenefitsRate: rows.length ? sum(rows.map((row) => row.benefitsRate)) / rows.length : 0,
  }
}

export interface WeeklySummary extends Overview {
  weekEnding: string
  weekDate: Date
}

export function getWeeklySummaries(rows: PayrollRow[]): WeeklySummary[] {
  const groups = new Map<string, PayrollRow[]>()
  for (const row of rows) groups.set(row.weekEnding, [...(groups.get(row.weekEnding) ?? []), row])
  return [...groups.entries()]
    .map(([weekEnding, group]) => ({ weekEnding, weekDate: group[0].weekDate, ...getOverview(group) }))
    .sort((a, b) => a.weekDate.getTime() - b.weekDate.getTime())
}

export interface EmployeeSummary {
  employeeId: string
  name: string
  level: WorkerLevel
  occupation: string
  weeks: number
  totalHours: number
  overtimeHours: number
  cashWages: number
  minActiveDayHours: number
  maxDayHours: number
  averageActiveDayHours: number
  minStandardRate: number
  maxStandardRate: number
  averageStandardRate: number
  minOvertimeRate: number
  maxOvertimeRate: number
  averageOvertimeRate: number
  minBenefitsRate: number
  maxBenefitsRate: number
  averageBenefitsRate: number
  rows: PayrollRow[]
}

export function getEmployeeSummaries(rows: PayrollRow[]): EmployeeSummary[] {
  const groups = new Map<string, PayrollRow[]>()
  for (const row of rows) groups.set(row.employeeId, [...(groups.get(row.employeeId) ?? []), row])
  return [...groups.entries()].map(([employeeId, group]) => {
    const ordered = [...group].sort((a, b) => a.weekDate.getTime() - b.weekDate.getTime())
    const dailyHours = group.flatMap((row) => days.map((_, i) => row.standardHours[i] + row.overtimeHours[i]))
    const activeDays = dailyHours.filter((hours) => hours > 0)
    const rates = (key: 'standardRate' | 'overtimeRate' | 'benefitsRate') => group.map((row) => row[key])
    const standard = rates('standardRate')
    const overtime = rates('overtimeRate')
    const benefits = rates('benefitsRate')
    return {
      employeeId,
      name: ordered.at(-1)!.employeeName,
      level: ordered.at(-1)!.level,
      occupation: ordered.at(-1)!.occupation,
      weeks: new Set(group.map((row) => row.weekEnding)).size,
      totalHours: sum(group.map((row) => row.totalHours)),
      overtimeHours: sum(group.map((row) => row.totalOvertimeHours)),
      cashWages: sum(group.map((row) => row.cashWages)),
      minActiveDayHours: activeDays.length ? Math.min(...activeDays) : 0,
      maxDayHours: Math.max(...dailyHours),
      averageActiveDayHours: activeDays.length ? sum(activeDays) / activeDays.length : 0,
      minStandardRate: Math.min(...standard), maxStandardRate: Math.max(...standard), averageStandardRate: sum(standard) / standard.length,
      minOvertimeRate: Math.min(...overtime), maxOvertimeRate: Math.max(...overtime), averageOvertimeRate: sum(overtime) / overtime.length,
      minBenefitsRate: Math.min(...benefits), maxBenefitsRate: Math.max(...benefits), averageBenefitsRate: sum(benefits) / benefits.length,
      rows: ordered,
    }
  }).sort((a, b) => a.name.localeCompare(b.name))
}
