import { useEffect, useRef, useMemo } from 'react'
import type { ChartRendererProps } from '../../types/index.ts'
import type { FunnelStageItem } from '../../types/chartData.ts'
import { drawFunnelChart } from './canvas/drawFunnelChart.ts'

interface FunnelChartProps extends ChartRendererProps {
  /** Optional field mapping */
  labelField?: string
  valueField?: string
  conversionRateField?: string
}

/**
 * Generic funnel chart component with automatic data transformation.
 * Visualizes multi-stage conversion flows with optional conversion rates.
 * Uses canvas rendering for VR compatibility.
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
  const canvasRef = useRef<HTMLCanvasElement>(null)

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

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const cleanup = drawFunnelChart(canvas, stages, width, height, onItemClick)
    return cleanup ?? undefined
  }, [stages, width, height, onItemClick])

  return <canvas ref={canvasRef} style={{ display: 'block' }} />
}
