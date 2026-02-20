import { useMemo } from 'react'
import type { ChartRendererProps } from '../../types/index.ts'
import type { CohortItem } from '../../types/chartData.ts'

function getColor(value: number): string {
  if (value >= 80) return '#10b981'
  if (value >= 60) return '#34d399'
  if (value >= 40) return '#fbbf24'
  if (value >= 20) return '#f97316'
  return '#ef4444'
}

interface CohortChartProps extends ChartRendererProps {
  /** Optional field mapping */
  labelField?: string
  retentionField?: string
}

/**
 * Generic cohort retention heatmap with automatic data transformation.
 * Visualizes retention rates across cohorts and time periods.
 */
export function CohortChart({
  data,
  width,
  height,
  labelField,
  retentionField,
}: CohortChartProps) {
  // Transform raw data to CohortItem[]
  const cohorts: CohortItem[] = useMemo(() => {
    if (!Array.isArray(data)) return []

    const labelKey = labelField || 'label'
    const retentionKey = retentionField || 'retention'

    return data.map((item, index) => {
      const label =
        item[labelKey] ||
        item.cohort ||
        item.name ||
        item.period ||
        `Cohort ${index + 1}`

      let retention: number[] = []
      if (Array.isArray(item[retentionKey])) {
        retention = item[retentionKey].map((v: unknown) => Number(v) || 0)
      } else if (Array.isArray(item.retention)) {
        retention = item.retention.map((v: unknown) => Number(v) || 0)
      } else if (Array.isArray(item.values)) {
        retention = item.values.map((v: unknown) => Number(v) || 0)
      }

      return { label: String(label), retention }
    })
  }, [data, labelField, retentionField])

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
        <div key={cohort.label} style={{ display: 'flex', alignItems: 'center' }}>
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
            {cohort.label}
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
