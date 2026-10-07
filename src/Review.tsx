import { useState } from 'react'
import { findReviewFlags, type FlagCategory } from './anomalies'
import { payrollRows, type PayrollRow } from './data'
import { weekLabel } from './format'

const allFlags = findReviewFlags(payrollRows)

export default function Review({ rows }: { rows: PayrollRow[] }) {
  const [category, setCategory] = useState<FlagCategory | 'all'>('all')
  const visibleRows = new Set(rows.map((row) => row.rowNumber))
  const flags = allFlags.filter((flag) => flag.sourceRows.some((source) => visibleRows.has(source.rowNumber)) && (category === 'all' || flag.category === category))
  return <div className="content"><div className="page-title"><div><span className="eyebrow">Workspace / Review queue</span><h1>Needs review</h1><p className="muted">Statistical and threshold-based cues for a human reviewer. A flag is not a confirmed error or compliance finding.</p></div><span className="source-pill">{flags.length} flags</span></div>
    <section className="panel rule-panel"><div><span className="eyebrow">How flags work</span><h2>Explainable review rules</h2></div><p className="muted">Rates and weekly hours are compared with the same employee’s other weeks. A statistical flag needs at least five comparison weeks and a difference of 2.5 standard deviations, plus a material difference ($2/hour for wages, $1/hour for benefits, or 10 weekly hours). Rate changes also need a 10% difference. Separate guardrails flag days over 16 hours and weeks over 60 hours.</p></section>
    <div className="review-controls" aria-label="Flag categories">{(['all', 'hours', 'rates', 'identity'] as const).map((item) => <button key={item} className={category === item ? 'active' : ''} aria-pressed={category === item} onClick={() => setCategory(item)}>{item === 'all' ? 'All flags' : item}</button>)}</div>
    <div className="flag-list">{flags.map((flag) => <article className="panel flag-card" key={flag.id}><div className="flag-top"><span className={flag.severity === 'high' ? 'flag-pill high' : 'flag-pill'}>{flag.severity === 'high' ? 'High priority' : 'Review'}</span><span className="flag-category">{flag.category}</span></div><div className="flag-main"><div><h2>{flag.title}</h2><p className="muted">{flag.row.employeeName} · ID {flag.row.employeeId} · week ending {weekLabel(flag.row.weekDate)} · CSV row {flag.row.rowNumber}</p></div><strong>{flag.observed}</strong></div><p className="flag-reason">{flag.reason}</p></article>)}</div>
    {!flags.length && <section className="panel"><h2>No flags in this view</h2><p className="muted">Try another week, occupation, level, or flag category.</p></section>}
  </div>
}
