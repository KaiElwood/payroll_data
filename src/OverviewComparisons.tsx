import { getWeeklySummaries, type PayrollRow } from './data'
import { number, percent, weekLabel } from './format'
import WeeklyBarChart from './WeeklyBarChart'

export default function OverviewComparisons({ rows }: { rows: PayrollRow[] }) {
  const weeks = getWeeklySummaries(rows)
  if (!weeks.length) return null
  const overtime = weeks.map((week) => ({
    key: week.weekEnding, label: weekLabel(week.weekDate),
    primary: week.totalHours ? week.overtimeHours / week.totalHours : 0,
  }))
  const levels = weeks.map((week) => ({
    key: week.weekEnding, label: weekLabel(week.weekDate),
    primary: week.apprenticeHours, secondary: week.totalHours - week.apprenticeHours,
  }))

  return <div className="comparison-grid">
    <section className="panel">
      <div className="section-heading"><div><span className="eyebrow">Hours over time</span><h2>Overtime share</h2></div></div>
      <p className="hint">Overtime hours ÷ all reported hours in each week. Weeks with zero hours display 0%.</p>
      <WeeklyBarChart points={overtime} title="Weekly overtime share" description="Overtime hours divided by all reported hours for each reporting week. Hour totals and shares rounded to 0.1 percentage point are in the table below." formatTick={percent} formatValue={percent} primaryLabel="overtime share" />
      <details className="chart-data"><summary>View overtime share values</summary><div className="table-scroll"><table><thead><tr><th scope="col">Week ending</th><th scope="col">Overtime hours</th><th scope="col">Total hours</th><th scope="col">Share</th></tr></thead><tbody>
        {weeks.map((week) => <tr key={week.weekEnding}><td>{weekLabel(week.weekDate)}</td><td>{number(week.overtimeHours, 1)} h</td><td>{number(week.totalHours, 1)} h</td><td>{percent(week.totalHours ? week.overtimeHours / week.totalHours : 0)}</td></tr>)}
      </tbody></table></div></details>
    </section>
    <section className="panel">
      <div className="section-heading"><div><span className="eyebrow">Hours over time</span><h2>Hours by worker level</h2></div></div>
      <p className="hint">Weekly apprentice and journeyworker hours, summed from the reported records.</p>
      <div className="chart-legend"><span><i className="legend-standard" />Apprentice</span><span><i className="legend-overtime" />Journeyworker</span></div>
      <WeeklyBarChart points={levels} title="Weekly hours by worker level" description="Apprentice and journeyworker hours by reporting week. Exact values are in the table below." formatTick={(value) => `${number(value)} h`} formatValue={(value) => `${number(value, 1)} hours`} primaryLabel="apprentice" secondaryLabel="journeyworker" />
      <details className="chart-data"><summary>View worker level hours</summary><div className="table-scroll"><table><thead><tr><th scope="col">Week ending</th><th scope="col">Apprentice</th><th scope="col">Journeyworker</th><th scope="col">Total</th></tr></thead><tbody>
        {weeks.map((week) => <tr key={week.weekEnding}><td>{weekLabel(week.weekDate)}</td><td>{number(week.apprenticeHours, 1)} h</td><td>{number(week.totalHours - week.apprenticeHours, 1)} h</td><td>{number(week.totalHours, 1)} h</td></tr>)}
      </tbody></table></div></details>
    </section>
  </div>
}
