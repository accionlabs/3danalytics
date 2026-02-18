import { useEffect, useRef } from 'react'
import type { ChartRendererProps } from '../../types/index.ts'
import type { KpiMetric } from '../../types/index.ts'
import { drawKpiCard } from './canvas/drawKpiCard.ts'

export function KpiCard({ data, width, height, onItemClick }: ChartRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const metrics = data as KpiMetric[]

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const cleanup = drawKpiCard(canvas, metrics, width, height, onItemClick)
    return cleanup ?? undefined
  }, [metrics, width, height, onItemClick])

  return <canvas ref={canvasRef} style={{ display: 'block' }} />
}
