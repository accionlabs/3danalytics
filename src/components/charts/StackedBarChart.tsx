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

// Default mock data when no data is provided
const DEFAULT_DATA = [
  { label: 'Account A', series1: 45, series2: 30, series3: 25 },
  { label: 'Account B', series1: 35, series2: 40, series3: 15 },
  { label: 'Account C', series1: 55, series2: 25, series3: 20 },
  { label: 'Account D', series1: 30, series2: 35, series3: 35 },
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

  // Handle nested data structure: { points: [...], series: [...] } or direct array
  const { effectiveData, dataSeries } = useMemo(() => {
    // Check if data is nested object with 'points' property
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const nested = data as { points?: unknown[]; series?: StackedBarSeries[] }
      return {
        effectiveData: Array.isArray(nested.points) && nested.points.length > 0 ? nested.points : DEFAULT_DATA,
        dataSeries: nested.series,
      }
    }
    // Direct array format
    if (Array.isArray(data) && data.length > 0) {
      return { effectiveData: data, dataSeries: undefined }
    }
    return { effectiveData: DEFAULT_DATA, dataSeries: undefined }
  }, [data])

  // Auto-detect series if not provided
  const series = useMemo(() => {
    // Priority: prop > data.series > auto-detect > default
    if (customSeries) return customSeries
    if (dataSeries) return dataSeries

    // If no custom series, try to detect numeric fields from first data item
    if (effectiveData.length > 0) {
      const firstItem = effectiveData[0]
      const detectedSeries: StackedBarSeries[] = []
      const colors = ['#3b82f6', '#10b981', '#f43f5e', '#8b5cf6', '#f59e0b']

      Object.keys(firstItem).forEach((key, i) => {
        const value = firstItem[key]
        // Skip x-axis field and non-numeric fields
        const xAxisField = xField || 'x'
        if (key === xAxisField || key === 'label' || key === 'x' || typeof value !== 'number') return

        detectedSeries.push({
          key,
          label: key.charAt(0).toUpperCase() + key.slice(1), // Capitalize
          color: colors[i % colors.length],
        })
      })

      return detectedSeries.length > 0 ? detectedSeries : DEFAULT_SERIES
    }

    return DEFAULT_SERIES
  }, [customSeries, dataSeries, effectiveData, xField])

  // Transform raw data to StackedBarPoint[]
  const chartData: StackedBarPoint[] = useMemo(() => {
    const xKey = xField || 'x'

    return effectiveData.map((item, index) => {
      const x =
        item[xKey] ||
        item.x ||
        item.label ||
        item.month ||
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
  }, [effectiveData, series, xField])

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
