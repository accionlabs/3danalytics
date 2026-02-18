import { useEffect, useRef } from 'react'
import type { ChartRendererProps } from '../../types/index.ts'
import type { RevenueDataPoint } from '../../types/index.ts'
import { drawRevenueChart } from './canvas/drawRevenueChart.ts'

export function RevenueChart({ data, width, height }: ChartRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartData = data as RevenueDataPoint[]

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const cleanup = drawRevenueChart(canvas, chartData, width, height)
    return cleanup ?? undefined
  }, [chartData, width, height])

  return <canvas ref={canvasRef} style={{ display: 'block' }} />
}
