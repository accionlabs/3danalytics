import { useMemo } from 'react'
import type { ChartRendererProps } from '../../types/index.ts'
import type { FunnelStageItem } from '../../types/chartData.ts'

const COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef']

interface FunnelChartProps extends ChartRendererProps {
  /** Optional field mapping */
  labelField?: string
  valueField?: string
  conversionRateField?: string
}

/**
 * Generic funnel chart component with automatic data transformation.
 * Visualizes multi-stage conversion flows with optional conversion rates.
 */
export function FunnelChart({
  data,
  width,
  height,
  onItemClick,
  labelField,
  valueField,
  conversionRateField,
}: FunnelChartProps) {
  // Transform raw data to FunnelStageItem[]
  const stages: FunnelStageItem[] = useMemo(() => {
    if (!Array.isArray(data)) return []

    const labelKey = labelField || 'label'
    const valueKey = valueField || 'value'
    const rateKey = conversionRateField || 'conversionRate'

    return data.map((item, index) => {
      const label =
        item[labelKey] ||
        item.stage ||
        item.name ||
        item.step ||
        `Stage ${index + 1}`

      const value = Number(
        item[valueKey] || item.count || item.users || item.amount || 0
      )

      const conversionRate =
        item[rateKey] !== undefined ? Number(item[rateKey]) : undefined

      const color = item.color

      return { label: String(label), value, conversionRate, color }
    })
  }, [data, labelField, valueField, conversionRateField])

  const maxCount = stages[0]?.value ?? 1
  const fontSize = Math.max(10, Math.round(width * 0.024))
  const labelHeight = fontSize + 4
  const barHeight = Math.max(12, Math.floor((height - stages.length * labelHeight) / stages.length) - 4)

  return (
    <div
      style={{
        width,
        height,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 2,
        padding: '4px 0',
      }}
    >
      {stages.map((stage, i) => {
        const barWidth = Math.max(40, (stage.value / maxCount) * width)
        const barColor = stage.color || COLORS[i % COLORS.length]
        return (
          <div
            key={stage.label}
            onClick={onItemClick ? (e) => { e.stopPropagation(); onItemClick(i, stage.label) } : undefined}
            style={{ cursor: onItemClick ? 'pointer' : 'default' }}
          >
            {/* Label row: stage name left, count right */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 2,
              }}
            >
              <span
                style={{
                  color: '#c0d0e0',
                  fontSize,
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                }}
              >
                {stage.label}
              </span>
              <span
                style={{
                  color: '#8090b0',
                  fontSize: fontSize - 1,
                  whiteSpace: 'nowrap',
                }}
              >
                {stage.value.toLocaleString()}
                {stage.conversionRate !== undefined && ` (${stage.conversionRate}%)`}
              </span>
            </div>
            {/* Bar */}
            <div
              style={{
                width: barWidth,
                height: barHeight,
                background: `linear-gradient(90deg, ${barColor}, ${barColor}88)`,
                borderRadius: '0 4px 4px 0',
                transition: 'width 0.5s ease',
              }}
            />
          </div>
        )
      })}
    </div>
  )
}
