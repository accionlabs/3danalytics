import * as d3 from 'd3'
import type { RevenueDataPoint } from '../../../types/index.ts'

const LINES: Array<{ key: keyof RevenueDataPoint & ('mrr' | 'newRevenue' | 'churnedRevenue'); color: string; label: string }> = [
  { key: 'mrr', color: '#3b82f6', label: 'MRR' },
  { key: 'newRevenue', color: '#10b981', label: 'New Revenue' },
  { key: 'churnedRevenue', color: '#f43f5e', label: 'Churned' },
]

/**
 * Draws a multi-line revenue chart using D3 + Canvas 2D API.
 * Safe to call in the VR texture pipeline — no DOM visibility required.
 */
export function drawRevenueChart(
  canvas: HTMLCanvasElement,
  chartData: RevenueDataPoint[],
  width: number,
  height: number,
): void {
  const ctx = canvas.getContext('2d')
  if (!ctx || chartData.length === 0) return

  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  canvas.width = width * dpr
  canvas.height = height * dpr
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
  ctx.scale(dpr, dpr)

  const mt = 10
  const mr = Math.round(width * 0.06)
  const mb = 50  // extra bottom space for legend
  const ml = Math.round(width * 0.12)
  const fontSize = Math.max(10, Math.round(width * 0.024))

  const months = chartData.map((d) => d.month)
  const xScale = d3.scalePoint().domain(months).range([ml, width - mr])

  const allValues = LINES.flatMap((l) => chartData.map((d) => d[l.key]))
  const maxY = d3.max(allValues) ?? 0
  const yScale = d3
    .scaleLinear()
    .domain([0, maxY * 1.1])
    .range([height - mb, mt])
    .nice()

  // Background
  ctx.fillStyle = '#080c1c'
  ctx.fillRect(0, 0, width, height)

  // Horizontal grid lines
  ctx.strokeStyle = '#1a2540'
  ctx.lineWidth = 1
  ctx.setLineDash([3, 3])
  for (const tick of yScale.ticks(5)) {
    const y = yScale(tick)
    ctx.beginPath()
    ctx.moveTo(ml, y)
    ctx.lineTo(width - mr, y)
    ctx.stroke()
  }
  ctx.setLineDash([])

  // Y-axis labels
  ctx.fillStyle = '#7090b0'
  ctx.font = `${fontSize}px system-ui, sans-serif`
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  for (const tick of yScale.ticks(5)) {
    ctx.fillText(`$${(tick / 1000).toFixed(0)}k`, ml - 6, yScale(tick))
  }

  // X-axis labels
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  for (const month of months) {
    ctx.fillText(month, xScale(month) ?? 0, height - mb + 6)
  }

  // Lines
  for (const { key, color } of LINES) {
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.lineJoin = 'round'
    ctx.beginPath()
    chartData.forEach((d, i) => {
      const x = xScale(d.month) ?? 0
      const y = yScale(d[key])
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()
  }

  // Legend row at bottom
  const legendY = height - 14
  let legendX = ml
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  ctx.font = `${fontSize}px system-ui, sans-serif`
  for (const { color, label } of LINES) {
    ctx.fillStyle = color
    ctx.fillRect(legendX, legendY - 4, 14, 3)
    ctx.fillStyle = '#8090a0'
    ctx.fillText(label, legendX + 18, legendY - 2)
    legendX += 18 + ctx.measureText(label).width + 14
  }
}
