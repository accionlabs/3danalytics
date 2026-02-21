import { useEffect, useRef, useMemo } from 'react'
import type { ChartRendererProps } from '../../types/index.ts'
import type { LineChartPoint, LineSeries, RevenueChartData } from '../../types/chartData.ts'
import { drawRevenueChart } from './canvas/drawRevenueChart.ts'

interface LineChartProps extends ChartRendererProps {
  /** Series configuration (lines to draw) */
  series?: LineSeries[]
  /** Optional field mapping for x-axis */
  xField?: string
}

/** Type guard to check if data is in RevenueChartData format */
function isRevenueChartData(data: unknown): data is RevenueChartData {
  return (
    data !== null &&
    typeof data === 'object' &&
    'points' in data &&
    'series' in data &&
    Array.isArray((data as RevenueChartData).points) &&
    Array.isArray((data as RevenueChartData).series)
  )
}

const DEFAULT_SERIES: LineSeries[] = [
  { key: 'mrr', label: 'MRR', color: '#3b82f6' },
  { key: 'newRevenue', label: 'New Revenue', color: '#10b981' },
  { key: 'churnedRevenue', label: 'Churned', color: '#f43f5e' },
]

/**
 * Generic multi-line chart component with automatic data transformation.
 * Detects numeric fields and renders them as separate lines.
 *
 * Supports two data formats:
 * 1. Array format: data is directly an array of points
 * 2. Object format: data = { points: [...], series: [...] }
 */
export function RevenueChart({ data, width, height, series: customSeries, xField }: LineChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Extract points and series from data (handle both formats)
  const { dataPoints, apiSeries } = useMemo(() => {
    // Format 2: Object with points and series properties (from API)
    if (isRevenueChartData(data)) {
      return {
        dataPoints: data.points,
        apiSeries: data.series,
      }
    }
    // Format 1: Direct array
    return {
      dataPoints: Array.isArray(data) ? data : [],
      apiSeries: undefined,
    }
  }, [data])

  // Map color names to hex values
  const colorMap: Record<string, string> = {
    blue: '#3b82f6',
    green: '#10b981',
    orange: '#f59e0b',
    red: '#ef4444',
    purple: '#8b5cf6',
    pink: '#ec4899',
    yellow: '#eab308',
    cyan: '#06b6d4',
  }

  // Auto-detect series if not provided
  const series = useMemo(() => {
    // Priority 1: Custom series from props
    if (customSeries) return customSeries

    // Priority 2: Series from API data
    if (apiSeries && apiSeries.length > 0) {
      return apiSeries.map(s => ({
        ...s,
        // Map color names to hex values
        color: colorMap[s.color.toLowerCase()] || s.color,
      }))
    }

    // Priority 3: Auto-detect from first data item
    if (Array.isArray(dataPoints) && dataPoints.length > 0) {
      const firstItem = dataPoints[0]
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
  }, [customSeries, apiSeries, dataPoints, xField])

  // Transform raw data to LineChartPoint[]
  const chartData: LineChartPoint[] = useMemo(() => {
    if (!Array.isArray(dataPoints)) return []

    const xKey = xField || 'month' || 'x' || 'date' || 'time'

    return dataPoints.map((item, index) => {
      const x = item[xKey] || item.month || item.x || item.date || `Point ${index + 1}`

      // Start with x field
      const point: LineChartPoint = { x: String(x) }

      // Add all series values
      series.forEach(({ key }) => {
        point[key] = Number(item[key]) || 0
      })

      return point
    })
  }, [dataPoints, series, xField])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const cleanup = drawRevenueChart(canvas, chartData, series, width, height)
    return cleanup ?? undefined
  }, [chartData, series, width, height])

  return <canvas ref={canvasRef} style={{ display: 'block' }} />
}
