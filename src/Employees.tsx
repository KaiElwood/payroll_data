import { useState } from 'react'
import { getEmployeeSummaries, type EmployeeSummary, type PayrollRow } from './data'
import { compareLatestWeeks, getEmployeeWeeks, type WeekComparison } from './employeeAnalysis'
import { money, number, weekLabel } from './format'
import WeeklyBarChart from './WeeklyBarChart'

function RateRow({ label, min, average, max }: { label: string; min: number; average: number; max: number }) {
  return <tr><th scope="row">{label}</th><td>{money(min, 2)}</td><td>{money(average, 2)}</td><td>{money(max, 2)}</td></tr>
}

function LatestComparison({ comparison }: { comparison: WeekComparison | null }) {
  if (!comparison) return <p className="hint">At least two reported weeks are needed for a comparison. Try selecting all weeks.</p>
  const { current, previous, hoursChange, overtimeChange, wagesChange } = comparison
  const signed = (value: number, formatted: string) => `${value > 0 ? '+' : value < 0 ? '−' : ''}${formatted}`
  return <>
    <p className="hint">{weekLabel(current.weekDate)} compared with the previous reported week, {weekLabel(previous.weekDate)}. A gap between reports is possible.</p>
    <div className="table-scroll"><table><thead><tr><th scope="col">Metric</th><th scope="col">Previous</th><th scope="col">Latest</th><th scope="col">Change</th></tr></thead><tbody>
      <tr><th scope="row">Total hours</th><td>{number(previous.totalHours, 1)} h</td><td>{number(current.totalHours, 1)} h</td><td>{signed(hoursChange, `${number(Math.abs(hoursChange), 1)} h`)}</td></tr>
      <tr><th scope="row">Overtime hours</th><td>{number(previous.overtimeHours, 1)} h</td><td>{number(current.overtimeHours, 1)} h</td><td>{signed(overtimeChange, `${number(Math.abs(overtimeChange), 1)} h`)}</td></tr>
      <tr><th scope="row">Cash wages</th><td>{money(previous.cashWages)}</td><td>{money(current.cashWages)}</td><td>{signed(wagesChange, money(Math.abs(wagesChange)))}</td></tr>
    </tbody></table></div>
  </>
}

function EmployeeDetail({ employee }: { employee: EmployeeSummary }) {
  const weeks = getEmployeeWeeks(employee.rows)
  const points = weeks.map((week) => ({ key: week.weekEnding, label: weekLabel(week.weekDate), primary: week.standardHours, secondary: week.overtimeHours }))
  return <div className="employee-detail">
    <div className="section-heading"><div><span className="eyebrow">Employee detail</span><h2>{employee.name}</h2><p className="muted">ID {employee.employeeId} · {employee.occupation} · {employee.level.toLowerCase()}</p></div><span className="pill">{employee.weeks} weeks</span></div>
    <div className="detail-metrics"><div><span>Total hours</span><strong>{number(employee.totalHours, 1)}</strong></div><div><span>Overtime hours</span><strong>{number(employee.overtimeHours, 1)}</strong></div><div><span>Cash wages</span><strong>{money(employee.cashWages)}</strong></div></div>
    <h3>Weekly hours</h3><p className="hint">Standard and overtime hours, combined across any records in the same reporting week.</p>
    <div className="chart-legend"><span><i className="legend-standard" />Standard</span><span><i className="legend-overtime" />Overtime</span></div>
    <WeeklyBarChart points={points} title={`${employee.name} weekly hours`} description="Standard and overtime hours by reporting week. Exact weekly totals are in the table below." formatTick={(value) => `${number(value, value < 10 ? 1 : 0)} h`} formatValue={(value) => `${number(value, 1)} hours`} primaryLabel="standard" secondaryLabel="overtime" />
    <details className="chart-data"><summary>View weekly hour totals</summary><div className="table-scroll"><table><thead><tr><th scope="col">Week ending</th><th scope="col">Standard</th><th scope="col">Overtime</th><th scope="col">Total</th></tr></thead><tbody>{weeks.map((week) => <tr key={week.weekEnding}><td>{weekLabel(week.weekDate)}</td><td>{number(week.standardHours, 1)} h</td><td>{number(week.overtimeHours, 1)} h</td><td>{number(week.totalHours, 1)} h</td></tr>)}</tbody></table></div></details>
    <h3>Change from previous reported week</h3><LatestComparison comparison={compareLatestWeeks(weeks)} />
    <h3>Daily hours</h3><p className="hint">Minimum and average use days with reported work; maximum includes all days.</p>
    <div className="detail-metrics"><div><span>Minimum active day</span><strong>{number(employee.minActiveDayHours, 1)} h</strong></div><div><span>Average active day</span><strong>{number(employee.averageActiveDayHours, 1)} h</strong></div><div><span>Maximum day</span><strong>{number(employee.maxDayHours, 1)} h</strong></div></div>
    <h3>Hourly rates</h3><div className="table-scroll"><table><thead><tr><th scope="col">Rate</th><th scope="col">Minimum</th><th scope="col">Average</th><th scope="col">Maximum</th></tr></thead><tbody>
      <RateRow label="Standard" min={employee.minStandardRate} average={employee.averageStandardRate} max={employee.maxStandardRate} />
      <RateRow label="Overtime" min={employee.minOvertimeRate} average={employee.averageOvertimeRate} max={employee.maxOvertimeRate} />
      <RateRow label="Benefits" min={employee.minBenefitsRate} average={employee.averageBenefitsRate} max={employee.maxBenefitsRate} />
    </tbody></table></div>
    <h3>Weekly records</h3><div className="table-scroll"><table><thead><tr><th scope="col">Week ending</th><th scope="col">Standard</th><th scope="col">Overtime</th><th scope="col">Cash wages</th></tr></thead><tbody>{employee.rows.map((row) => <tr key={row.rowNumber}><td>{weekLabel(row.weekDate)}</td><td>{number(row.totalStandardHours, 1)} h</td><td>{number(row.totalOvertimeHours, 1)} h</td><td>{money(row.cashWages)}</td></tr>)}</tbody></table></div>
  </div>
}

export default function Employees({ rows }: { rows: PayrollRow[] }) {
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const employees = getEmployeeSummaries(rows).filter((employee) =>
    `${employee.name} ${employee.employeeId} ${employee.occupation}`.toLowerCase().includes(query.trim().toLowerCase())
  )
  const selected = employees.find((employee) => employee.employeeId === selectedId) ?? employees[0]
  return <div className="content"><div className="page-title"><div><span className="eyebrow">Workspace / Employees</span><h1>Employee overviews</h1><p className="muted">Explore hours, rates, and weekly payroll history for each worker.</p></div></div>
    <div className="employee-layout"><section className="panel employee-list"><div className="section-heading"><div><span className="eyebrow">Directory</span><h2>{employees.length} employees</h2></div></div><label className="search-label" htmlFor="employee-search">Search employees</label><input id="employee-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, ID, or occupation" />
      <div className="employee-items">{employees.map((employee) => <button key={employee.employeeId} className={employee.employeeId === selected?.employeeId ? 'employee-item selected' : 'employee-item'} aria-pressed={employee.employeeId === selected?.employeeId} onClick={() => setSelectedId(employee.employeeId)}><span><strong>{employee.name}</strong><small>{employee.occupation} · {employee.level.toLowerCase()}</small></span><span className="employee-hours">{number(employee.totalHours, 1)} h</span></button>)}</div>{!employees.length && <p className="muted">No employees match this search and the selected filters.</p>}
    </section><section className="panel">{selected ? <EmployeeDetail employee={selected} /> : <p className="muted">Select a different filter to see employee details.</p>}</section></div>
  </div>
}
