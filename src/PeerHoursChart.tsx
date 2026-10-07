import { useState } from 'react'
import { scaleBand, scaleLinear } from 'd3-scale'
import type { PeerWeek } from './employeeAnalysis'
import { number, weekLabel } from './format'

const width = 720
const height = 240
const margin = { top: 12, right: 12, bottom: 34, left: 48 }

export default function PeerHoursChart({ weeks }: { weeks: PeerWeek[] }) {
  const [hovered, setHovered] = useState<string | null>(null)
  const [focused, setFocused] = useState<string | null>(null)
  const [source, setSource] = useState<'hover' | 'focus'>('hover')
  if (!weeks.length) return null
  const largest = Math.max(...weeks.map((week) => Math.max(week.employeeHours, week.peerAverage ?? 0)))
  const x = scaleBand<string>().domain(weeks.map((week) => week.weekEnding)).range([margin.left, width - margin.right]).padding(0.25)
  const y = scaleLinear().domain([0, largest || 1]).nice(4).range([height - margin.bottom, margin.top])
  const labelStep = Math.max(1, Math.ceil(weeks.length / 6))
  const activeKey = source === 'hover' ? hovered ?? focused : focused ?? hovered
  const active = weeks.find((week) => week.weekEnding === activeKey)
  const tipWidth = 210
  const tipX = active ? Math.max(margin.left, Math.min((x(active.weekEnding) ?? 0) + x.bandwidth() / 2 - tipWidth / 2, width - margin.right - tipWidth)) : 0
  const tipY = active ? Math.max(margin.top, y(Math.max(active.employeeHours, active.peerAverage ?? 0)) - 72) : 0

  return <div className="chart-scroll"><svg className="weekly-chart" viewBox={`0 0 ${width} ${height}`} role="group" aria-label="Weekly hours compared with occupation and level peers">
    <title>Weekly hours compared with peers</title><desc>Each week pairs the employee's hours with the mean hours per other employee in the same occupation and level. The table below gives hour totals and peer counts.</desc>
    {y.ticks(4).map((tick) => <g key={tick}><line className="chart-gridline" x1={margin.left} x2={width - margin.right} y1={y(tick)} y2={y(tick)} /><text className="chart-axis-label" x={margin.left - 8} y={y(tick) + 4} textAnchor="end">{number(tick)} h</text></g>)}
    {weeks.map((week, index) => {
      const start = x(week.weekEnding) ?? 0
      const barWidth = Math.min(19, (x.bandwidth() - 4) / 2)
      const midpoint = start + x.bandwidth() / 2
      const employeeX = midpoint - barWidth - 2
      const peerX = midpoint + 2
      const employeeTop = y(week.employeeHours)
      const peerTop = y(week.peerAverage ?? 0)
      return <g key={week.weekEnding} className="chart-week" tabIndex={0} role="group" aria-label={`Week ending ${week.weekEnding}: employee ${number(week.employeeHours, 1)} hours; ${week.peerCount ? `average of ${week.peerCount} peers ${number(week.peerAverage!, 1)} hours` : 'no peers reported'}`}
        onMouseEnter={() => { setHovered(week.weekEnding); setSource('hover') }} onMouseLeave={() => setHovered(null)}
        onFocus={() => { setFocused(week.weekEnding); setSource('focus') }} onBlur={() => setFocused(null)}>
        <rect className="chart-hit-area" x={start} y={margin.top} width={x.bandwidth()} height={y(0) - margin.top} />
        <rect className="chart-bar-primary" x={employeeX} y={employeeTop} width={barWidth} height={y(0) - employeeTop} />
        {week.peerCount > 0 && <rect className="chart-bar-secondary" x={peerX} y={peerTop} width={barWidth} height={y(0) - peerTop} />}
        {(index % labelStep === 0 || index === weeks.length - 1) && <text className="chart-axis-label" x={midpoint} y={height - 10} textAnchor="middle">{weekLabel(week.weekDate)}</text>}
      </g>
    })}
    {active && <g className="chart-tooltip" aria-hidden="true" pointerEvents="none"><rect x={tipX} y={tipY} width={tipWidth} height={64} rx={8} /><text className="chart-tooltip-week" x={tipX + 12} y={tipY + 19}>Week ending {active.weekEnding}</text><text x={tipX + 12} y={tipY + 39}>Employee: {number(active.employeeHours, 1)} h</text><text x={tipX + 12} y={tipY + 56}>{active.peerCount ? `Peer mean (${active.peerCount}): ${number(active.peerAverage!, 1)} h` : 'No peers reported'}</text></g>}
  </svg></div>
}
