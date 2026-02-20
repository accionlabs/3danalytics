import * as d3 from 'd3'
import type { AreaChartData } from '../../../types/chartData.ts'
import { drawTooltip } from './tooltipHelper.ts'

/**
 * Draws an area chart with optional reference line.
 * Generic implementation — accepts any time series data.
 * Uses D3 + Canvas 2D API.
 * Returns a cleanup function (removes event listeners).
 * Safe to call in the VR texture pipeline — no DOM visibility required.
 */
export function drawChurnChart(
  canvas: HTMLCanvasElement,
  config: AreaChartData,
  width: number,
  height: number,
): (() => void) | void {
  const { points: chartData, referenceLine } = config
  if (chartData.length === 0) return
  const ctx = canvas.getContext('2d')!

  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  canvas.width = width * dpr
  canvas.height = height * dpr
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
  ctx.scale(dpr, dpr)

  const mt = 10
  const mr = Math.round(width * 0.14)
  const mb = 40
  const ml = Math.round(width * 0.10)
  const fontSize = Math.max(10, Math.round(width * 0.024))
  const tooltipFontSize = Math.max(11, Math.round(width * 0.026))

  // Calculate average value if reference line not provided
  const avgValue = referenceLine?.value ?? (chartData.reduce((sum, d) => sum + d.y, 0) / chartData.length)
  const xLabels = chartData.map((d) => d.x)
  const xScale = d3.scalePoint().domain(xLabels).range([ml, width - mr])

  const maxValue = d3.max(chartData, (d) => d.y) ?? 0
  const yScale = d3
    .scaleLinear()
    .domain([0, Math.max(maxValue * 1.1, avgValue * 1.3)])
    .range([height - mb, mt])
    .nice()

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

    // Gradient fill
    const grad = ctx.createLinearGradient(0, mt, 0, height - mb)
    grad.addColorStop(0, 'rgba(244,63,94,0.4)')
    grad.addColorStop(1, 'rgba(244,63,94,0)')
    ctx.fillStyle = grad
    ctx.beginPath()
    chartData.forEach((d, i) => {
      const x = xScale(d.x) ?? 0
      const y = yScale(d.y)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    const lastX = xScale(chartData[chartData.length - 1].x) ?? 0
    const firstX = xScale(chartData[0].x) ?? 0
    ctx.lineTo(lastX, height - mb)
    ctx.lineTo(firstX, height - mb)
    ctx.closePath()
    ctx.fill()

    // Area stroke line
    ctx.strokeStyle = '#f43f5e'
    ctx.lineWidth = 2
    ctx.lineJoin = 'round'
    ctx.beginPath()
    chartData.forEach((d, i) => {
      const x = xScale(d.x) ?? 0
      const y = yScale(d.y)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()

    // Reference line (e.g., average)
    const refY = yScale(avgValue)
    const refColor = referenceLine?.color || '#f59e0b'
    const refLabel = referenceLine?.label || 'Avg'
    ctx.strokeStyle = refColor
    ctx.lineWidth = 1.5
    ctx.setLineDash([5, 5])
    ctx.beginPath()
    ctx.moveTo(ml, refY)
    ctx.lineTo(width - mr, refY)
    ctx.stroke()
    ctx.setLineDash([])

    ctx.fillStyle = refColor
    ctx.font = `${fontSize}px system-ui, sans-serif`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(refLabel, width - mr + 4, refY)

    ctx.fillStyle = '#7090b0'
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
  }

  drawBase()

  const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height)

  const handleMouseMove = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.offsetWidth / rect.width
    const scaleY = canvas.offsetHeight / rect.height
    const mx = (e.clientX - rect.left) * scaleX
    const my = (e.clientY - rect.top) * scaleY

    let nearestIdx = 0
    let minDist = Infinity
    xPositions.forEach((px, i) => {
      const dist = Math.abs(mx - px)
      if (dist < minDist) { minDist = dist; nearestIdx = i }
    })

    const inChartArea = mx >= ml && mx <= width - mr && my >= mt && my <= height - mb
    ctx.putImageData(snapshot, 0, 0)
    if (inChartArea && minDist < (xScale.step() ?? width) / 2 + 4) {
      const d = chartData[nearestIdx]
      drawTooltip(ctx, mx, my, [
        d.x,
        formatTooltipValue(d.y),
      ], width, height, tooltipFontSize)

      // Dot on the line at nearest point
      const px = xPositions[nearestIdx]
      const py = yScale(d.y)
      ctx.beginPath()
      ctx.arc(px, py, 4, 0, Math.PI * 2)
      ctx.fillStyle = '#f43f5e'
      ctx.fill()
      ctx.strokeStyle = '#080c1c'
      ctx.lineWidth = 1.5
      ctx.stroke()
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
