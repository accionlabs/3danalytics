import type { ChartRendererProps } from '../../types/index.ts'
import type { KpiMetric } from '../../types/index.ts'

function formatValue(value: number, unit: string): string {
  if (unit === '$') {
    if (value >= 1000) return `$${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`
    return `$${value.toFixed(2)}`
  }
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
  return `${value}`
}

function TrendArrow({ direction }: { direction: 'up' | 'down' | 'flat' }) {
  if (direction === 'up') return <span style={{ color: '#10b981' }}>&#9650;</span>
  if (direction === 'down') return <span style={{ color: '#f43f5e' }}>&#9660;</span>
  return <span style={{ color: '#6b7280' }}>&#9644;</span>
}

export function KpiCard({ data, width, height, onItemClick }: ChartRendererProps) {
  const metrics = data as KpiMetric[]
  const cols = metrics.length <= 3 ? metrics.length : Math.ceil(metrics.length / 2)
  const gap = Math.round(width * 0.015)
  const cardWidth = Math.floor((width - gap * (cols - 1)) / cols)
  const cardHeight = metrics.length > cols ? Math.floor((height - gap) / 2) : height
  const labelSize = Math.max(10, Math.round(width * 0.022))
  const valueSize = Math.max(16, Math.round(width * 0.055))
  const trendSize = Math.max(10, Math.round(width * 0.022))

  return (
    <div
      style={{
        width,
        height,
        display: 'flex',
        flexWrap: 'wrap',
        gap,
        alignContent: 'center',
        justifyContent: 'center',
      }}
    >
      {metrics.map((metric, i) => (
        <div
          key={metric.label}
          onClick={onItemClick ? (e) => { e.stopPropagation(); onItemClick(i) } : undefined}
          style={{
            width: cardWidth,
            height: cardHeight,
            background: 'rgba(20, 30, 50, 0.6)',
            borderRadius: 8,
            border: '1px solid #1e2a40',
            padding: '10px 14px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            cursor: onItemClick ? 'pointer' : 'default',
            transition: 'border-color 0.15s',
            ...(onItemClick ? { ':hover': { borderColor: '#3b82f6' } } : {}),
          }}
          onMouseEnter={onItemClick ? (e) => { (e.currentTarget as HTMLElement).style.borderColor = '#3b82f6' } : undefined}
          onMouseLeave={onItemClick ? (e) => { (e.currentTarget as HTMLElement).style.borderColor = '#1e2a40' } : undefined}
        >
          <div style={{ color: '#6080a0', fontSize: labelSize, marginBottom: 6 }}>
            {metric.label}
          </div>
          <div style={{ color: '#e0e8f0', fontSize: valueSize, fontWeight: 700 }}>
            {formatValue(metric.value, metric.unit)}
          </div>
          <div style={{ fontSize: trendSize, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
            <TrendArrow direction={metric.trendDirection} />
            <span
              style={{
                color:
                  metric.trendDirection === 'up'
                    ? '#10b981'
                    : metric.trendDirection === 'down'
                      ? '#f43f5e'
                      : '#6b7280',
              }}
            >
              {metric.trend > 0 ? '+' : ''}{metric.trend}%
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
