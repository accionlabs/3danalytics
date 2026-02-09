import type { ChartRendererProps } from '../../types/index.ts'
import type { CohortRow } from '../../types/index.ts'

function getColor(value: number): string {
  if (value >= 80) return '#10b981'
  if (value >= 60) return '#34d399'
  if (value >= 40) return '#fbbf24'
  if (value >= 20) return '#f97316'
  return '#ef4444'
}

export function CohortChart({ data, width, height }: ChartRendererProps) {
  const cohorts = data as CohortRow[]
  const maxMonths = Math.max(...cohorts.map((c) => c.retention.length))
  const labelWidth = Math.round(width * 0.15)
  const headerHeight = Math.round(height * 0.08)
  const cellWidth = Math.floor((width - labelWidth - 8) / maxMonths)
  const cellHeight = Math.floor((height - headerHeight - 8) / cohorts.length)
  const fontSize = Math.max(10, Math.round(width * 0.022))

  return (
    <div style={{ width, height, overflow: 'hidden' }}>
      {/* Header row */}
      <div style={{ display: 'flex', marginLeft: labelWidth, marginBottom: 2, height: headerHeight }}>
        {Array.from({ length: maxMonths }, (_, i) => (
          <div
            key={i}
            style={{
              width: cellWidth,
              textAlign: 'center',
              color: '#7090b0',
              fontSize,
              lineHeight: `${headerHeight}px`,
            }}
          >
            M{i}
          </div>
        ))}
      </div>

      {/* Cohort rows */}
      {cohorts.map((cohort) => (
        <div key={cohort.cohort} style={{ display: 'flex', alignItems: 'center' }}>
          <div
            style={{
              width: labelWidth,
              color: '#8090a0',
              fontSize,
              textAlign: 'right',
              paddingRight: 8,
              flexShrink: 0,
            }}
          >
            {cohort.cohort}
          </div>
          {cohort.retention.map((value, mi) => (
            <div
              key={mi}
              style={{
                width: cellWidth,
                height: cellHeight,
                background: getColor(value),
                opacity: 0.85,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: value >= 40 ? '#0a0a1a' : '#fff',
                fontSize: fontSize - 1,
                fontWeight: 600,
                border: '1px solid rgba(10, 10, 26, 0.3)',
                borderRadius: 2,
              }}
            >
              {value}%
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
