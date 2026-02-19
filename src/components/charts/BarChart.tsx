import { useEffect, useRef, useMemo } from 'react'
import type { ChartRendererProps } from '../../types/index.ts'
import type { BarItem, FieldMapping } from '../../types/chartData.ts'
import { drawBarChart } from './canvas/drawBarChart.ts'

interface BarChartProps extends ChartRendererProps {
  /** Optional field mapping to adapt to different data shapes */
  mapping?: FieldMapping
}

/**
 * Generic bar chart component with automatic data transformation.
 * Accepts any array of objects and maps fields to the generic BarItem interface.
 */
export function BarChart({ data, width, height, onItemClick, mapping }: BarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Transform raw data to generic BarItem[] with intelligent fallbacks
  const chartData: BarItem[] = useMemo(() => {
    if (!Array.isArray(data)) return []

    const labelField = mapping?.labelField || 'label'
    const valueField = mapping?.valueField || 'value'
    const colorField = mapping?.colorField

    return data.map((item, index) => {
      // Try mapping fields, then common alternatives, then index-based fallback
      const label =
        item[labelField] ||
        item.product ||
        item.name ||
        item.category ||
        `Item ${index + 1}`

      const value =
        Number(item[valueField] || item.revenue || item.amount || item.count || 0)

      const color = colorField ? item[colorField] : undefined

      return {
        label: String(label),
        value,
        color,
      }
    })
  }, [data, mapping])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const cleanup = drawBarChart(canvas, chartData, width, height, onItemClick)
    return cleanup ?? undefined
  }, [chartData, width, height, onItemClick])

  return <canvas ref={canvasRef} style={{ display: 'block' }} />
}
