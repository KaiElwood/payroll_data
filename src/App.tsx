import { useMemo, useState } from 'react'
import { getWeeklySummaries, payrollRows } from './data'
import { weekLabel } from './format'
import Overview from './Overview'
import Employees from './Employees'
import Review from './Review'

type Page = 'overview' | 'employees' | 'review'

export default function App() {
  const [page, setPage] = useState<Page>('overview')
  const [level, setLevel] = useState('all')
  const [occupation, setOccupation] = useState('all')
  const [week, setWeek] = useState('all')
  const occupations = useMemo(() => [...new Set(payrollRows.map((row) => row.occupation))].sort(), [])
  const weeks = useMemo(() => getWeeklySummaries(payrollRows), [])
  const rows = useMemo(() => payrollRows.filter((row) =>
    (level === 'all' || row.level === level) &&
    (occupation === 'all' || row.occupation === occupation) &&
    (week === 'all' || row.weekEnding === week)
  ), [level, occupation, week])

  return <div className="layout">
    <aside className="sidebar"><div className="brand"><span className="brand-mark">P</span><div><strong>PAYROLL</strong><small>REPORTING</small></div></div><p className="sidebar-label">WORKSPACE</p><nav aria-label="Main navigation"><button className={page === 'overview' ? 'active' : ''} onClick={() => setPage('overview')}>▦ <span>Overview</span></button><button className={page === 'employees' ? 'active' : ''} onClick={() => setPage('employees')}>♙ <span>Employees</span></button><button className={page === 'review' ? 'active' : ''} onClick={() => setPage('review')}>◇ <span>Review queue</span></button></nav><div className="sidebar-foot"><i /> Local dataset <small>March–June 2025</small></div></aside>
    <main className="main"><header className="topbar"><strong>Project payroll <span>/ {page === 'overview' ? 'Overview' : page === 'employees' ? 'Employees' : 'Review queue'}</span></strong><span>CSV reporting prototype</span></header><div className="filters" aria-label="Report filters"><label>Level<select value={level} onChange={(event) => setLevel(event.target.value)}><option value="all">All levels</option><option value="APPRENTICE">Apprentice</option><option value="JOURNEYWORKER">Journeyworker</option></select></label><label>Occupation<select value={occupation} onChange={(event) => setOccupation(event.target.value)}><option value="all">All occupations</option>{occupations.map((item) => <option key={item}>{item}</option>)}</select></label><label>Week ending<select value={week} onChange={(event) => setWeek(event.target.value)}><option value="all">All weeks</option>{weeks.map((item) => <option key={item.weekEnding} value={item.weekEnding}>{weekLabel(item.weekDate)}</option>)}</select></label><span className="filter-count">{rows.length} records</span></div>{page === 'overview' ? <Overview rows={rows} /> : page === 'employees' ? <Employees rows={rows} /> : <Review rows={rows} />}</main>
  </div>
}
