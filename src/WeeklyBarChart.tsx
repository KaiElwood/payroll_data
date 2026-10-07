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
  if (!points.length) return <p className="muted">No weeks match the filters.</p>
  const max = Math.max(1, ...points.map((point) => point.primary + (point.secondary ?? 0)))
  const x = scaleBand<string>()
    .domain(points.map((point) => point.key))
    .range([margin.left, width - margin.right])
    .padding(0.25)
  const y = scaleLinear().domain([0, max]).nice(4).range([height - margin.bottom, margin.top])
  const ticks = y.ticks(4)
  const labelStep = Math.max(1, Math.ceil(points.length / 6))
  const barWidth = Math.min(42, x.bandwidth())

  return <div className="chart-scroll">
    <svg className="weekly-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
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
        return <g key={point.key}>
          <rect className="chart-bar-primary" x={xPos} y={primaryTop} width={barWidth} height={bottom - primaryTop}>
            <title>{point.label}: {primaryLabel} {formatValue(point.primary)}</title>
          </rect>
          {point.secondary !== undefined && <rect className="chart-bar-secondary" x={xPos} y={secondaryTop} width={barWidth} height={primaryTop - secondaryTop}>
            <title>{point.label}: {secondaryLabel} {formatValue(point.secondary)}</title>
          </rect>}
          {(index % labelStep === 0 || index === points.length - 1) &&
            <text className="chart-axis-label" x={xPos + barWidth / 2} y={height - 10} textAnchor="middle">{point.label}</text>}
        </g>
      })}
    </svg>
  </div>
}
