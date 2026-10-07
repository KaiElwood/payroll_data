import { useState } from 'react'
import { scaleBand, scaleLinear } from 'd3-scale'

export interface ChartWeek {
  key: string
  label: string
  primary: number
  secondary?: number
}

interface Props {
  points: ChartWeek[]
  title: string
  description: string
  formatTick: (value: number) => string
  formatValue: (value: number) => string
  primaryLabel: string
  secondaryLabel?: string
}

const width = 720
const height = 250
const margin = { top: 15, right: 12, bottom: 34, left: 58 }

export default function WeeklyBarChart({ points, title, description, formatTick, formatValue, primaryLabel, secondaryLabel }: Props) {
  const [hoveredWeek, setHoveredWeek] = useState<string | null>(null)
  const [focusedWeek, setFocusedWeek] = useState<string | null>(null)
  const [activeSource, setActiveSource] = useState<'hover' | 'focus'>('hover')
  if (!points.length) return <p className="muted">No weeks match the filters.</p>
  const largest = Math.max(...points.map((point) => point.primary + (point.secondary ?? 0)))
  const max = largest > 0 ? largest : 1
  const x = scaleBand<string>()
    .domain(points.map((point) => point.key))
    .range([margin.left, width - margin.right])
    .padding(0.25)
  const y = scaleLinear().domain([0, max]).nice(4).range([height - margin.bottom, margin.top])
  const ticks = y.ticks(4)
  const labelStep = Math.max(1, Math.ceil(points.length / 6))
  const barWidth = Math.min(42, x.bandwidth())
  const activeKey = activeSource === 'hover' ? hoveredWeek ?? focusedWeek : focusedWeek ?? hoveredWeek
  const activePoint = points.find((point) => point.key === activeKey)
  const tooltipWidth = 190
  const tooltipHeight = activePoint?.secondary === undefined ? 58 : 76
  const activeX = activePoint ? (x(activePoint.key) ?? 0) + x.bandwidth() / 2 : 0
  const tooltipX = Math.max(margin.left, Math.min(activeX - tooltipWidth / 2, width - margin.right - tooltipWidth))
  const activeTop = activePoint ? y(activePoint.primary + (activePoint.secondary ?? 0)) : 0
  const tooltipY = Math.max(margin.top, Math.min(activeTop - tooltipHeight - 8, height - margin.bottom - tooltipHeight))

  return <div className="chart-scroll">
    <svg className="weekly-chart" viewBox={`0 0 ${width} ${height}`} role="group" aria-label={title}>
      <title>{title}</title><desc>{description}</desc>
      {ticks.map((tick) => <g key={tick}>
        <line className="chart-gridline" x1={margin.left} x2={width - margin.right} y1={y(tick)} y2={y(tick)} />
        <text className="chart-axis-label" x={margin.left - 9} y={y(tick) + 4} textAnchor="end">{formatTick(tick)}</text>
      </g>)}
      {points.map((point, index) => {
        const xPos = (x(point.key) ?? 0) + (x.bandwidth() - barWidth) / 2
        const bottom = y(0)
        const primaryTop = y(point.primary)
        const secondaryTop = y(point.primary + (point.secondary ?? 0))
        const detail = `Week ending ${point.key}`
        const values = `${primaryLabel} ${formatValue(point.primary)}${point.secondary === undefined ? '' : `, ${secondaryLabel} ${formatValue(point.secondary)}`}`
        return <g key={point.key} className="chart-week" tabIndex={0} role="group" aria-label={`${detail}: ${values}`}
          onMouseEnter={() => { setHoveredWeek(point.key); setActiveSource('hover') }} onMouseLeave={() => setHoveredWeek(null)}
          onFocus={() => { setFocusedWeek(point.key); setActiveSource('focus') }} onBlur={() => setFocusedWeek(null)}>
          <rect className="chart-hit-area" x={x(point.key) ?? 0} y={margin.top} width={x.bandwidth()} height={bottom - margin.top} />
          <rect className="chart-bar-primary" x={xPos} y={primaryTop} width={barWidth} height={bottom - primaryTop} />
          {point.secondary !== undefined && <rect className="chart-bar-secondary" x={xPos} y={secondaryTop} width={barWidth} height={primaryTop - secondaryTop} />}
          {(index % labelStep === 0 || index === points.length - 1) &&
            <text className="chart-axis-label" x={xPos + barWidth / 2} y={height - 10} textAnchor="middle">{point.label}</text>}
        </g>
      })}
      {activePoint && <g className="chart-tooltip" aria-hidden="true" pointerEvents="none">
        <rect x={tooltipX} y={tooltipY} width={tooltipWidth} height={tooltipHeight} rx={8} />
        <text className="chart-tooltip-week" x={tooltipX + 12} y={tooltipY + 19}>Week ending {activePoint.key}</text>
        <text x={tooltipX + 12} y={tooltipY + 39}>{primaryLabel}: {formatValue(activePoint.primary)}</text>
        {activePoint.secondary !== undefined && <text x={tooltipX + 12} y={tooltipY + 58}>{secondaryLabel}: {formatValue(activePoint.secondary)}</text>}
      </g>}
    </svg>
  </div>
}
