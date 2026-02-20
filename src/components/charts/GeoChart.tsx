import { useMemo } from 'react'
import type { ChartRendererProps } from '../../types/index.ts'
import type { GeoItem } from '../../types/chartData.ts'

const REGION_COLORS: Record<string, string> = {
  'North America': '#3b82f6',
  'Europe': '#6366f1',
  'Asia Pacific': '#8b5cf6',
  'Latin America': '#10b981',
  'Middle East & Africa': '#f59e0b',
}

const DEFAULT_COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#6366f1']

interface GeoChartProps extends ChartRendererProps {
  /** Optional field mapping */
  labelField?: string
  valueField?: string
  secondaryValueField?: string
}

/**
 * Generic geographic/regional chart with automatic data transformation.
 * Visualizes values across regions/categories as horizontal bars.
 */
export function GeoChart({
  data,
  width,
  height,
  labelField,
  valueField,
  secondaryValueField,
}: GeoChartProps) {
  // Transform raw data to GeoItem[]
  const regions: GeoItem[] = useMemo(() => {
    if (!Array.isArray(data)) return []

    const labelKey = labelField || 'label'
    const valueKey = valueField || 'value'
    const secondaryKey = secondaryValueField || 'secondaryValue'

    return data.map((item, index) => {
      const label =
        item[labelKey] ||
        item.region ||
        item.name ||
        item.category ||
        item.location ||
        `Region ${index + 1}`

      const value = Number(
        item[valueKey] || item.revenue || item.amount || item.count || 0
      )

      const secondaryValue =
        item[secondaryKey] !== undefined
          ? Number(item[secondaryKey])
          : item.customers !== undefined
          ? Number(item.customers)
          : undefined

      const color =
        item.color || REGION_COLORS[String(label)] || DEFAULT_COLORS[index % DEFAULT_COLORS.length]

      return { label: String(label), value, secondaryValue, color }
    })
  }, [data, labelField, valueField, secondaryValueField])

  const maxRevenue = Math.max(...regions.map((r) => r.value))
  const labelWidth = Math.round(width * 0.3)
  const fontSize = Math.max(10, Math.round(width * 0.024))
  const barHeight = Math.min(32, Math.floor((height - 20) / regions.length) - 8)

  // Generic number formatter
  function formatValue(val: number): string {
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`
    if (val >= 1000) return `${(val / 1000).toFixed(0)}k`
    if (val % 1 === 0) return val.toString()
    return val.toFixed(1)
  }

  return (
    <div style={{ width, height, display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        {regions.map((region) => {
          const barWidth = Math.max(
            40,
            (region.value / maxRevenue) * (width - labelWidth - 20),
          )

          return (
            <div
              key={region.label}
              style={{ display: 'flex', alignItems: 'center', gap: 10 }}
            >
              <div
                style={{
                  width: labelWidth,
                  textAlign: 'right',
                  color: '#8090b0',
                  fontSize,
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {region.label}
              </div>
              <div
                style={{
                  width: barWidth,
                  height: barHeight,
                  background: `linear-gradient(90deg, ${region.color}, ${region.color}66)`,
                  borderRadius: '0 6px 6px 0',
                  display: 'flex',
                  alignItems: 'center',
                  paddingLeft: 8,
                }}
              >
                <span style={{ color: '#fff', fontSize, fontWeight: 600 }}>
                  {formatValue(region.value)}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
