import Papa from 'papaparse'
import csvText from '../payroll_data (3).csv?raw'
import { days, type PayrollRow } from './data'

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
