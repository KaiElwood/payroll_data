import { useMemo, useState } from 'react'
import { getWeeklySummaries, payrollRows } from './data'
import { weekLabel } from './format'
import Overview from './Overview'
import Employees from './Employees'
import Review from './Review'

type Page = 'overview' | 'employees' | 'review'
const pages: { key: Page; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'employees', label: 'Employees' },
  { key: 'review', label: 'Review queue' },
]

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
  const hasFilters = level !== 'all' || occupation !== 'all' || week !== 'all'

  function clearFilters() {
    setLevel('all')
    setOccupation('all')
    setWeek('all')
  }

  return <div className="layout">
    <header className="site-header">
      <div className="brand"><span className="brand-mark">P</span><strong>Payroll reporting</strong></div>
      <nav aria-label="Main navigation">
        {pages.map((item) => <button key={item.key} className={page === item.key ? 'active' : ''} aria-current={page === item.key ? 'page' : undefined} onClick={() => setPage(item.key)}>{item.label}</button>)}
      </nav>
      <span className="header-note"><i /> Local CSV</span>
    </header>
    <main className="main">
      <div className="filters" aria-label="Report filters">
        <span className="filter-heading">Explore the data</span>
        <label>Level<select value={level} onChange={(event) => setLevel(event.target.value)}><option value="all">All levels</option><option value="APPRENTICE">Apprentice</option><option value="JOURNEYWORKER">Journeyworker</option></select></label>
        <label>Occupation<select value={occupation} onChange={(event) => setOccupation(event.target.value)}><option value="all">All occupations</option>{occupations.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Week ending<select value={week} onChange={(event) => setWeek(event.target.value)}><option value="all">All weeks</option>{weeks.map((item) => <option key={item.weekEnding} value={item.weekEnding}>{weekLabel(item.weekDate)}</option>)}</select></label>
        <span className="filter-count">{rows.length} records</span>
        {hasFilters && <button className="clear-filters" onClick={clearFilters}>Clear filters</button>}
      </div>
      {page === 'overview' ? <Overview rows={rows} /> : page === 'employees' ? <Employees rows={rows} /> : <Review rows={rows} />}
    </main>
  </div>
}
