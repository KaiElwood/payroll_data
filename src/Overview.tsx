import { getOverview, getWeeklySummaries, type PayrollRow } from './data'
import { money, number, percent, weekLabel } from './format'

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return <div className="stat"><span className="caption">{label}</span><strong>{value}</strong><small>{note}</small></div>
}

function WageTrend({ rows }: { rows: PayrollRow[] }) {
  const weeks = getWeeklySummaries(rows)
  const max = Math.max(1, ...weeks.map((week) => week.cashWages))
  return <section className="panel trend">
    <div className="section-heading"><div><span className="eyebrow">Trend</span><h2>Weekly wage spend</h2></div><span className="pill">Cash wages</span></div>
    {weeks.length ? <>
      <div className="bars" role="img" aria-label="Cash wages by reporting week">
        {weeks.map((week) => <div className="bar-slot" key={week.weekEnding} title={`${weekLabel(week.weekDate)}: ${money(week.cashWages)}`}>
          <div className="bar" style={{ height: `${Math.max(4, week.cashWages / max * 100)}%` }} />
        </div>)}
      </div>
      <div className="chart-labels"><span>{weekLabel(weeks[0].weekDate)}</span><span>{weekLabel(weeks.at(-1)!.weekDate)}</span></div>
    </> : <p className="muted">No weeks match the filters.</p>}
  </section>
}

export default function Overview({ rows }: { rows: PayrollRow[] }) {
  const data = getOverview(rows)
  const latest = getWeeklySummaries(rows).at(-1)
  return <div className="content">
    <div className="page-title"><div><span className="eyebrow">Workspace / Overview</span><h1>Payroll at a glance</h1><p className="muted">Workforce hours, wage spend, and reporting patterns from the local CSV.</p></div><span className="source-pill"><i /> Local CSV source</span></div>
    <div className="stats">
      <Stat label="Cash wages" value={money(data.cashWages)} note="Standard + overtime pay" />
      <Stat label="Total hours" value={number(data.totalHours, 1)} note={`${number(data.overtimeHours, 1)} overtime hours`} />
      <Stat label="Employees" value={number(data.employees)} note={`${number(data.records)} weekly records`} />
      <Stat label="Apprentice share" value={percent(data.apprenticeShare)} note={`${number(data.apprenticeHours, 1)} of total hours`} />
    </div>
    <div className="two-column">
      <WageTrend rows={rows} />
      <section className="panel"><div className="section-heading"><div><span className="eyebrow">Composition</span><h2>Workforce mix</h2></div></div><div className="hero-number">{percent(data.apprenticeShare)}</div><p className="muted">of reported hours are apprentice hours</p><div className="mix-track"><span style={{ width: `${data.apprenticeShare * 100}%` }} /></div><div className="mix-key"><span><i className="key-apprentice" /> Apprentice</span><span><i className="key-journey" /> Journeyworker</span></div><div className="panel-divider" /><div className="summary-line"><span>Estimated benefits value</span><strong>{money(data.estimatedBenefits)}</strong></div><p className="hint">Hours × listed benefits rate, separate from cash wages.</p></section>
    </div>
    <section className="panel"><div className="section-heading"><div><span className="eyebrow">Recent activity</span><h2>Latest reporting week</h2></div>{latest && <span className="pill">{weekLabel(latest.weekDate)}</span>}</div>{latest ? <div className="week-stats"><div><span>Employees</span><strong>{latest.employees}</strong></div><div><span>Total hours</span><strong>{number(latest.totalHours, 1)}</strong></div><div><span>Cash wages</span><strong>{money(latest.cashWages)}</strong></div><div><span>Apprentice share</span><strong>{percent(latest.apprenticeShare)}</strong></div></div> : <p className="muted">No records match the filters.</p>}</section>
  </div>
}
