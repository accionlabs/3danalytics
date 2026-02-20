import * as d3 from 'd3'
import type { StackedBarPoint, StackedBarSeries } from '../../../types/chartData.ts'
import { drawTooltip } from './tooltipHelper.ts'

const COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#f43f5e']

type StackedBarHit = {
  x: number
  y: number
  w: number
  h: number
  i: number
  label: string
  segments: Array<{ series: StackedBarSeries; value: number; y: number; height: number }>
}

/**
 * Draws a stacked bar chart using D3 + Canvas 2D API.
 * Generic implementation — accepts any data via StackedBarPoint interface with multiple series.
 * Returns a cleanup function (removes event listeners).
 * Safe to call in the VR texture pipeline — no DOM visibility required.
 */
export function drawStackedBarChart(
  canvas: HTMLCanvasElement,
  chartData: StackedBarPoint[],
  series: StackedBarSeries[],
  width: number,
  height: number,
  onItemClick?: (index: number, category?: string) => void,
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
  const mb = 40
  const ml = Math.round(width * 0.12)
  const fontSize = Math.max(10, Math.round(width * 0.024))
  const tooltipFontSize = Math.max(11, Math.round(width * 0.026))

  const xLabels = chartData.map((d) => d.x)
  const xScale = d3
    .scaleBand()
    .domain(xLabels)
    .range([ml, width - mr])
    .padding(0.25)

  // Calculate stacked values for each bar
  const stackedData = chartData.map((point) => {
    const values = series.map((s) => Number(point[s.key]) || 0)
    const total = values.reduce((sum, v) => sum + v, 0)
    return { point, values, total }
  })

  const maxValue = d3.max(stackedData, (d) => d.total) ?? 0
  const yScale = d3
    .scaleLinear()
    .domain([0, maxValue * 1.1])
    .range([height - mb, mt])
    .nice()

  const barPositions: StackedBarHit[] = []

  // Generic number formatter - adapts to value magnitude
  function formatValue(val: number): string {
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`
    if (val >= 1000) return `${(val / 1000).toFixed(0)}k`
    if (val % 1 === 0) return val.toString()
    return val.toFixed(1)
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

    barPositions.length = 0
    stackedData.forEach(({ point, values, total }, i) => {
      const bx = xScale(point.x) ?? 0
      const bw = xScale.bandwidth()
      const baseY = yScale(total)
      const r = Math.min(4, bw / 2)

      // Draw stacked segments from bottom to top
      let cumulativeValue = 0
      const segments: Array<{
        series: StackedBarSeries
        value: number
        y: number
        height: number
      }> = []

      series.forEach((s, seriesIndex) => {
        const value = values[seriesIndex]
        if (value <= 0) return // Skip zero values

        const previousCumulative = cumulativeValue
        cumulativeValue += value

        // Calculate segment position: bottom is at yScale(previousCumulative), top is at yScale(cumulativeValue)
        const segmentBottom = yScale(previousCumulative)
        const segmentTop = yScale(cumulativeValue)
        const segmentHeight = segmentBottom - segmentTop

        // Use series color or fallback to palette
        ctx.fillStyle = s.color || COLORS[seriesIndex % COLORS.length]

        // Draw rounded rectangle segment (only round top corners for top segment, bottom corners for bottom segment)
        const isBottom = previousCumulative === 0
        const isTop = cumulativeValue === total

        ctx.beginPath()
        if (isTop) {
          // Top segment: round top corners
          ctx.moveTo(bx + r, segmentTop)
          ctx.lineTo(bx + bw - r, segmentTop)
          ctx.quadraticCurveTo(bx + bw, segmentTop, bx + bw, segmentTop + r)
          ctx.lineTo(bx + bw, segmentBottom)
        } else {
          ctx.moveTo(bx, segmentTop)
          ctx.lineTo(bx + bw, segmentTop)
          ctx.lineTo(bx + bw, segmentBottom)
        }
        if (isBottom) {
          // Bottom segment: round bottom corners
          ctx.lineTo(bx + bw, segmentBottom)
          ctx.lineTo(bx, segmentBottom)
          ctx.lineTo(bx, segmentBottom - r)
          ctx.quadraticCurveTo(bx, segmentBottom, bx + r, segmentBottom)
          ctx.lineTo(bx + r, segmentTop)
        } else {
          ctx.lineTo(bx, segmentBottom)
          ctx.lineTo(bx, segmentTop)
        }
        ctx.closePath()
        ctx.fill()

        segments.push({
          series: s,
          value,
          y: segmentTop,
          height: segmentHeight,
        })
      })

      // Store bar position for hit testing (entire bar, not individual segments)
      barPositions.push({
        x: bx,
        y: baseY,
        w: bw,
        h: height - mb - baseY,
        i,
        label: point.x,
        segments,
      })
    })

    // Draw labels
    ctx.fillStyle = '#7090b0'
    ctx.font = `${fontSize}px system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    for (const point of chartData) {
      ctx.fillText(
        point.x,
        (xScale(point.x) ?? 0) + xScale.bandwidth() / 2,
        height - mb + 6,
      )
    }
  }

  drawBase()

  // Snapshot base render — putImageData restores it before every tooltip overlay.
  const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height)

  const handleMouseMove = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.offsetWidth / rect.width
    const scaleY = canvas.offsetHeight / rect.height
    const mx = (e.clientX - rect.left) * scaleX
    const my = (e.clientY - rect.top) * scaleY

    let hovered: StackedBarHit | null = null
    for (const bar of barPositions) {
      if (mx >= bar.x && mx <= bar.x + bar.w && my >= bar.y && my <= bar.y + bar.h) {
        hovered = bar
        break
      }
    }

    ctx.putImageData(snapshot, 0, 0)
    if (hovered) {
      const { label, segments } = hovered
      const total = segments.reduce((sum, s) => sum + s.value, 0)
      
      // Format numbers with proper locale formatting (commas, decimals)
      const formatTooltipValue = (val: number): string => {
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
      
      // Calculate percentage for each segment
      const tooltipLines = [
        label,
        `Total: ${formatTooltipValue(total)}`,
        ...segments.map((s) => {
          const percentage = total > 0 ? ((s.value / total) * 100).toFixed(1) : '0.0'
          return `${s.series.label}: ${formatTooltipValue(s.value)} (${percentage}%)`
        }),
      ]
      drawTooltip(ctx, mx, my, tooltipLines, width, height, tooltipFontSize)
    }
  }

  const handleMouseLeave = () => {
    ctx.putImageData(snapshot, 0, 0)
  }

  const handleClick = (e: MouseEvent) => {
    if (!onItemClick) return
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.offsetWidth / rect.width
    const scaleY = canvas.offsetHeight / rect.height
    const mx = (e.clientX - rect.left) * scaleX
    const my = (e.clientY - rect.top) * scaleY
    for (const bar of barPositions) {
      if (mx >= bar.x && mx <= bar.x + bar.w && my >= bar.y && my <= bar.y + bar.h) {
        e.stopPropagation()
        onItemClick(bar.i, bar.label)
        break
      }
    }
  }

  if (onItemClick) canvas.style.cursor = 'pointer'
  canvas.addEventListener('mousemove', handleMouseMove)
  canvas.addEventListener('mouseleave', handleMouseLeave)
  canvas.addEventListener('click', handleClick)

  return () => {
    canvas.removeEventListener('mousemove', handleMouseMove)
    canvas.removeEventListener('mouseleave', handleMouseLeave)
    canvas.removeEventListener('click', handleClick)
    canvas.style.cursor = ''
  }
}
