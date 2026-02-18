import * as d3 from 'd3'
import type { ChurnDataPoint } from '../../../types/index.ts'
import { drawTooltip } from './tooltipHelper.ts'

/**
 * Draws an area chart showing churn rate over time with an average reference line.
 * Uses D3 + Canvas 2D API.
 * Returns a cleanup function (removes event listeners).
 * Safe to call in the VR texture pipeline — no DOM visibility required.
 */
export function drawChurnChart(
  canvas: HTMLCanvasElement,
  chartData: ChurnDataPoint[],
  width: number,
  height: number,
): (() => void) | void {
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

  const avgChurn = chartData.reduce((sum, d) => sum + d.churnRate, 0) / chartData.length
  const months = chartData.map((d) => d.month)
  const xScale = d3.scalePoint().domain(months).range([ml, width - mr])

  const maxChurn = d3.max(chartData, (d) => d.churnRate) ?? 0
  const yScale = d3
    .scaleLinear()
    .domain([0, Math.max(maxChurn * 1.1, avgChurn * 1.3)])
    .range([height - mb, mt])
    .nice()

  const monthXs = months.map((m) => xScale(m) ?? 0)

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
      const x = xScale(d.month) ?? 0
      const y = yScale(d.churnRate)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    const lastX = xScale(chartData[chartData.length - 1].month) ?? 0
    const firstX = xScale(chartData[0].month) ?? 0
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
      const x = xScale(d.month) ?? 0
      const y = yScale(d.churnRate)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()

    // Average reference line
    const avgY = yScale(avgChurn)
    ctx.strokeStyle = '#f59e0b'
    ctx.lineWidth = 1.5
    ctx.setLineDash([5, 5])
    ctx.beginPath()
    ctx.moveTo(ml, avgY)
    ctx.lineTo(width - mr, avgY)
    ctx.stroke()
    ctx.setLineDash([])

    ctx.fillStyle = '#f59e0b'
    ctx.font = `${fontSize}px system-ui, sans-serif`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText('Avg', width - mr + 4, avgY)

    ctx.fillStyle = '#7090b0'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    for (const tick of yScale.ticks(5)) {
      ctx.fillText(`${tick}%`, ml - 6, yScale(tick))
    }

    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    for (const month of months) {
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
    monthXs.forEach((px, i) => {
      const dist = Math.abs(mx - px)
      if (dist < minDist) { minDist = dist; nearestIdx = i }
    })

    const inChartArea = mx >= ml && mx <= width - mr && my >= mt && my <= height - mb
    ctx.putImageData(snapshot, 0, 0)
    if (inChartArea && minDist < (xScale.step() ?? width) / 2 + 4) {
      const d = chartData[nearestIdx]
      drawTooltip(ctx, mx, my, [
        d.month,
        `Churn Rate: ${d.churnRate}%`,
        `Customers: ${d.customers.toLocaleString()}`,
        `Churned: ${d.churned.toLocaleString()}`,
      ], width, height, tooltipFontSize)

      // Dot on the line at nearest point
      const px = monthXs[nearestIdx]
      const py = yScale(d.churnRate)
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
