import { useEffect, useRef, useMemo } from 'react'
import type { ChartRendererProps } from '../../types/index.ts'
import type { AreaChartData } from '../../types/chartData.ts'
import { drawChurnChart } from './canvas/drawChurnChart.ts'

interface AreaChartProps extends ChartRendererProps {
  /** Optional field mapping */
  xField?: string
  yField?: string
  /** Optional reference line configuration */
  referenceLine?: { value?: number; label?: string; color?: string }
}

/**
 * Generic area chart component with automatic data transformation.
 * Can display any time series data as an area chart with optional reference line.
 */
export function ChurnChart({ data, width, height, xField, yField, referenceLine }: AreaChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Transform raw data to AreaChartData
  const chartConfig: AreaChartData = useMemo(() => {
    if (!Array.isArray(data)) return { points: [] }

    const xKey = xField || 'month' || 'x' || 'date'
    const yKey = yField || 'value' || 'y' || 'churnRate' || 'rate'

    const points = data.map((item, index) => ({
      x: String(item[xKey] || item.month || item.x || `Point ${index + 1}`),
      y: Number(item[yKey] || item.churnRate || item.value || item.y || 0),
    }))

    // Calculate average if reference line requested but no value provided
    let refLine: { value: number; label?: string; color?: string } | undefined = undefined
    if (referenceLine) {
      const value = referenceLine.value ?? (points.reduce((sum, p) => sum + p.y, 0) / points.length)
      refLine = {
        value,
        label: referenceLine.label,
        color: referenceLine.color,
      }
    }

    return { points, referenceLine: refLine }
  }, [data, xField, yField, referenceLine])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const cleanup = drawChurnChart(canvas, chartConfig, width, height)
    return cleanup ?? undefined
  }, [chartConfig, width, height])

  return <canvas ref={canvasRef} style={{ display: 'block' }} />
}
