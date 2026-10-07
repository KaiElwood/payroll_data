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

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0)
}

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
