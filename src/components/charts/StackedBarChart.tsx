import { useEffect, useRef, useMemo } from 'react'
import type { ChartRendererProps } from '../../types/index.ts'
import type { StackedBarPoint, StackedBarSeries } from '../../types/chartData.ts'
import { drawStackedBarChart } from './canvas/drawStackedBarChart.ts'

interface StackedBarChartProps extends ChartRendererProps {
  /** Series configuration (stacks to draw) */
  series?: StackedBarSeries[]
  /** Optional field mapping for x-axis */
  xField?: string
}

const DEFAULT_SERIES: StackedBarSeries[] = [
  { key: 'series1', label: 'Series 1', color: '#3b82f6' },
  { key: 'series2', label: 'Series 2', color: '#10b981' },
  { key: 'series3', label: 'Series 3', color: '#f43f5e' },
]

/**
 * Generic stacked bar chart component with automatic data transformation.
 * Detects numeric fields and renders them as stacked segments within each bar.
 */
export function StackedBarChart({
  data,
  width,
  height,
  series: customSeries,
  xField,
  onItemClick,
}: StackedBarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Auto-detect series if not provided
  const series = useMemo(() => {
    if (customSeries) return customSeries

    // If no custom series, try to detect numeric fields from first data item
    if (Array.isArray(data) && data.length > 0) {
      const firstItem = data[0]
      const detectedSeries: StackedBarSeries[] = []
      const colors = ['#3b82f6', '#10b981', '#f43f5e', '#8b5cf6', '#f59e0b']

      Object.keys(firstItem).forEach((key, i) => {
        const value = firstItem[key]
        // Skip x-axis field and non-numeric fields
        if (key === (xField || 'label') || typeof value !== 'number') return

        detectedSeries.push({
          key,
          label: key.charAt(0).toUpperCase() + key.slice(1), // Capitalize
          color: colors[i % colors.length],
        })
      })

      return detectedSeries.length > 0 ? detectedSeries : DEFAULT_SERIES
    }

    return DEFAULT_SERIES
  }, [customSeries, data, xField])

  // Transform raw data to StackedBarPoint[]
  const chartData: StackedBarPoint[] = useMemo(() => {
    if (!Array.isArray(data)) return []

    const xKey = xField || 'label'

    return data.map((item, index) => {
      const x =
        item[xKey] ||
        item.label ||
        item.month ||
        item.x ||
        item.date ||
        item.category ||
        `Item ${index + 1}`

      // Start with x field
      const point: StackedBarPoint = { x: String(x) }

      // Add all series values
      series.forEach(({ key }) => {
        point[key] = Number(item[key]) || 0
      })

      return point
    })
  }, [data, series, xField])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const cleanup = drawStackedBarChart(
      canvas,
      chartData,
      series,
      width,
      height,
      onItemClick,
    )
    return cleanup ?? undefined
  }, [chartData, series, width, height, onItemClick])

  return <canvas ref={canvasRef} style={{ display: 'block' }} />
}
