import { useEffect, useRef } from 'react'
import type { ChartRendererProps } from '../../types/index.ts'
import type { ChurnDataPoint } from '../../types/index.ts'
import { drawChurnChart } from './canvas/drawChurnChart.ts'

export function ChurnChart({ data, width, height }: ChartRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartData = data as ChurnDataPoint[]

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    drawChurnChart(canvas, chartData, width, height)
  }, [chartData, width, height])

  return <canvas ref={canvasRef} style={{ display: 'block' }} />
}
