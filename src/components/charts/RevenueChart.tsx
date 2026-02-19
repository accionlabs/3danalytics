import { useEffect, useRef, useMemo } from 'react'
import type { ChartRendererProps } from '../../types/index.ts'
import type { LineChartPoint, LineSeries } from '../../types/chartData.ts'
import { drawRevenueChart } from './canvas/drawRevenueChart.ts'

interface LineChartProps extends ChartRendererProps {
  /** Series configuration (lines to draw) */
  series?: LineSeries[]
  /** Optional field mapping for x-axis */
  xField?: string
}

const DEFAULT_SERIES: LineSeries[] = [
  { key: 'mrr', label: 'MRR', color: '#3b82f6' },
  { key: 'newRevenue', label: 'New Revenue', color: '#10b981' },
  { key: 'churnedRevenue', label: 'Churned', color: '#f43f5e' },
]

/**
 * Generic multi-line chart component with automatic data transformation.
 * Detects numeric fields and renders them as separate lines.
 */
export function RevenueChart({ data, width, height, series: customSeries, xField }: LineChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Auto-detect series if not provided
  const series = useMemo(() => {
    if (customSeries) return customSeries

    // If no custom series, try to detect numeric fields from first data item
    if (Array.isArray(data) && data.length > 0) {
      const firstItem = data[0]
      const detectedSeries: LineSeries[] = []
      const colors = ['#3b82f6', '#10b981', '#f43f5e', '#8b5cf6', '#f59e0b']

      Object.keys(firstItem).forEach((key, i) => {
        const value = firstItem[key]
        // Skip x-axis field and non-numeric fields
        if (key === (xField || 'month' || 'x') || typeof value !== 'number') return

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

  // Transform raw data to LineChartPoint[]
  const chartData: LineChartPoint[] = useMemo(() => {
    if (!Array.isArray(data)) return []

    const xKey = xField || 'month' || 'x' || 'date' || 'time'

    return data.map((item, index) => {
      const x = item[xKey] || item.month || item.x || item.date || `Point ${index + 1}`

      // Start with x field
      const point: LineChartPoint = { x: String(x) }

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
    const cleanup = drawRevenueChart(canvas, chartData, series, width, height)
    return cleanup ?? undefined
  }, [chartData, series, width, height])

  return <canvas ref={canvasRef} style={{ display: 'block' }} />
}
