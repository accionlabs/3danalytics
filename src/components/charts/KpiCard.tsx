import { useEffect, useRef, useMemo } from 'react'
import type { ChartRendererProps } from '../../types/index.ts'
import type { KpiCardItem } from '../../types/chartData.ts'
import { drawKpiCard } from './canvas/drawKpiCard.ts'

function formatValue(value: number, unit: string): string {
  if (unit === '$') {
    if (value >= 1000) return `$${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`
    return `$${value.toFixed(2)}`
  }
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
  return `${value}`
}

function getTrendColor(direction: 'up' | 'down' | 'flat'): string {
  if (direction === 'up') return '#10b981'
  if (direction === 'down') return '#f43f5e'
  return '#6b7280'
}

/**
 * Generic KPI card grid component with automatic data transformation.
 * Transforms raw metrics data into pre-formatted display cards.
 */
export function KpiCard({ data, width, height, onItemClick }: ChartRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Transform raw data to KpiCardItem[]
  const cardData: KpiCardItem[] = useMemo(() => {
    if (!Array.isArray(data)) return []

    return data.map((item) => {
      const label = item.label || item.name || 'Metric'
      const value = item.value !== undefined ? item.value : 0
      const unit = item.unit || ''

      // Pre-format the value
      const formattedValue = typeof value === 'string' ? value : formatValue(value, unit)

      // Build trend if available
      let trend
      if (item.trend !== undefined && item.trendDirection) {
        const trendValue = item.trend
        const trendStr = `${trendValue > 0 ? '+' : ''}${trendValue}%`
        trend = {
          value: trendStr,
          direction: item.trendDirection as 'up' | 'down' | 'flat',
          color: getTrendColor(item.trendDirection as 'up' | 'down' | 'flat'),
        }
      }

      return {
        label,
        value: formattedValue,
        trend,
      }
    })
  }, [data])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const cleanup = drawKpiCard(canvas, cardData, width, height, onItemClick)
    return cleanup ?? undefined
  }, [cardData, width, height, onItemClick])

  return <canvas ref={canvasRef} style={{ display: 'block' }} />
}
