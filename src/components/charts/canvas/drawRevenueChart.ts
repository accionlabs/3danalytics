import * as d3 from 'd3'
import type { LineChartPoint, LineSeries } from '../../../types/chartData.ts'
import { drawTooltip } from './tooltipHelper.ts'

/**
 * Draws a multi-line chart using D3 + Canvas 2D API.
 * Generic implementation — accepts any time series data with configurable lines.
 * Returns a cleanup function (removes event listeners).
 * Safe to call in the VR texture pipeline — no DOM visibility required.
 */
export function drawRevenueChart(
  canvas: HTMLCanvasElement,
  chartData: LineChartPoint[],
  series: LineSeries[],
  width: number,
  height: number,
): (() => void) | void {
  if (chartData.length === 0 || series.length === 0) return
  const ctx = canvas.getContext('2d')!

  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  canvas.width = width * dpr
  canvas.height = height * dpr
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
  ctx.scale(dpr, dpr)

  const mt = 10
  const mr = Math.round(width * 0.06)
  const mb = 50
  const ml = Math.round(width * 0.12)
  const fontSize = Math.max(10, Math.round(width * 0.024))
  const tooltipFontSize = Math.max(11, Math.round(width * 0.026))

  const xLabels = chartData.map((d) => d.x)
  const xScale = d3.scalePoint().domain(xLabels).range([ml, width - mr])

  const allValues = series.flatMap((l) => chartData.map((d) => Number(d[l.key]) || 0))
  const maxY = d3.max(allValues) ?? 0
  const yScale = d3
    .scaleLinear()
    .domain([0, maxY * 1.1])
    .range([height - mb, mt])
    .nice()

  // Pre-compute screen x positions for each x label (used in hit-testing)
  const xPositions = xLabels.map((label) => xScale(label) ?? 0)

  // Compact number formatter for labels - adapts to value magnitude
  function formatValue(val: number): string {
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`
    if (val >= 1000) return `${(val / 1000).toFixed(0)}k`
    if (val % 1 === 0) return val.toString()
    return val.toFixed(1)
  }

  // Detailed number formatter for tooltips - shows full numbers with proper formatting
  function formatTooltipValue(val: number): string {
    // For whole numbers, use locale string without decimals
    if (val % 1 === 0) {
      return val.toLocaleString('en-US', { maximumFractionDigits: 0 })
    }
    // For decimal numbers, show up to 2 decimal places
    return val.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    })
  }

  function drawBase() {
    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = '#080c1c'
    ctx.fillRect(0, 0, width, height)

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

    ctx.fillStyle = '#7090b0'
    ctx.font = `${fontSize}px system-ui, sans-serif`
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    for (const tick of yScale.ticks(5)) {
      ctx.fillText(formatValue(tick), ml - 6, yScale(tick))
    }

    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    for (const month of xLabels) {
      ctx.fillText(month, xScale(month) ?? 0, height - mb + 6)
    }

    for (const { key, color } of series) {
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.lineJoin = 'round'
      ctx.beginPath()
      chartData.forEach((d, i) => {
        const x = xScale(d.x) ?? 0
        const y = yScale(Number(d[key]) || 0)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.stroke()
    }

    // Legend row
    const legendY = height - 14
    let legendX = ml
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'left'
    ctx.font = `${fontSize}px system-ui, sans-serif`
    for (const { color, label } of series) {
      ctx.fillStyle = color
      ctx.fillRect(legendX, legendY - 4, 14, 3)
      ctx.fillStyle = '#8090a0'
      ctx.fillText(label, legendX + 18, legendY - 2)
      legendX += 18 + ctx.measureText(label).width + 14
    }
  }

  drawBase()

  const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height)

  const handleMouseMove = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.offsetWidth / rect.width
    const scaleY = canvas.offsetHeight / rect.height
    const mx = (e.clientX - rect.left) * scaleX
    const my = (e.clientY - rect.top) * scaleY

    // Find the nearest data-point index by X proximity
    let nearestIdx = 0
    let minDist = Infinity
    xPositions.forEach((px, i) => {
      const dist = Math.abs(mx - px)
      if (dist < minDist) { minDist = dist; nearestIdx = i }
    })

    // Only show tooltip when cursor is within the chart area
    const inChartArea = mx >= ml && mx <= width - mr && my >= mt && my <= height - mb
    ctx.putImageData(snapshot, 0, 0)
    if (inChartArea && minDist < xScale.step() / 2 + 4) {
      const d = chartData[nearestIdx]
      // Build tooltip lines: x-label + all series values
      const tooltipLines = [
        d.x,
        ...series.map(({ key, label }) => {
          const value = Number(d[key]) || 0
          return `${label}: ${formatTooltipValue(value)}`
        })
      ]
      drawTooltip(ctx, mx, my, tooltipLines, width, height, tooltipFontSize)

      // Crosshair dot on each line at this x
      for (const { key, color } of series) {
        const px = xPositions[nearestIdx]
        const py = yScale(Number(d[key]) || 0)
        ctx.beginPath()
        ctx.arc(px, py, 4, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.fill()
        ctx.strokeStyle = '#080c1c'
        ctx.lineWidth = 1.5
        ctx.stroke()
      }
    }
  }

  const handleMouseLeave = () => { ctx.putImageData(snapshot, 0, 0) }

  canvas.addEventListener('mousemove', handleMouseMove)
  canvas.addEventListener('mouseleave', handleMouseLeave)

  return () => {
    canvas.removeEventListener('mousemove', handleMouseMove)
    canvas.removeEventListener('mouseleave', handleMouseLeave)
  }
}
