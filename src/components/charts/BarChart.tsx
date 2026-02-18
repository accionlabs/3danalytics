import { useEffect, useRef } from 'react'
import type { ChartRendererProps } from '../../types/index.ts'
import type { ProductRevenue } from '../../types/index.ts'
import { drawBarChart } from './canvas/drawBarChart.ts'

export function BarChart({ data, width, height, onItemClick }: ChartRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const products = data as ProductRevenue[]

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const cleanup = drawBarChart(canvas, products, width, height, onItemClick)
    return cleanup ?? undefined
  }, [products, width, height, onItemClick])

  return <canvas ref={canvasRef} style={{ display: 'block' }} />
}
