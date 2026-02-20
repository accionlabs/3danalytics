import * as d3 from 'd3'
import type { BarItem } from '../../../types/chartData.ts'
import { drawTooltip } from './tooltipHelper.ts'

const COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#f43f5e']

type BarHit = { x: number; y: number; w: number; h: number; i: number; label: string }

/**
 * Draws a bar chart using D3 + Canvas 2D API.
 * Generic implementation — accepts any data via BarItem interface.
 * Returns a cleanup function (removes event listeners).
 * Safe to call in the VR texture pipeline — no DOM visibility required.
 */
export function drawBarChart(
  canvas: HTMLCanvasElement,
  items: BarItem[],
  width: number,
  height: number,
  onItemClick?: (index: number, label: string) => void,
): (() => void) | void {
  if (items.length === 0) return
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

  const xScale = d3
    .scaleBand()
    .domain(items.map((d) => d.label))
    .range([ml, width - mr])
    .padding(0.25)

  const maxValue = d3.max(items, (d) => d.value) ?? 0
  const yScale = d3
    .scaleLinear()
    .domain([0, maxValue * 1.1])
    .range([height - mb, mt])
    .nice()

  const barPositions: BarHit[] = []

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

    barPositions.length = 0
    items.forEach((d, i) => {
      const bx = xScale(d.label) ?? 0
      const bw = xScale.bandwidth()
      const by = yScale(d.value)
      const bh = height - mb - by
      const r = Math.min(4, bw / 2)

      // Use custom color if provided, otherwise cycle through default palette
      ctx.fillStyle = d.color || COLORS[i % COLORS.length]
      ctx.beginPath()
      ctx.moveTo(bx + r, by)
      ctx.lineTo(bx + bw - r, by)
      ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + r)
      ctx.lineTo(bx + bw, by + bh)
      ctx.lineTo(bx, by + bh)
      ctx.lineTo(bx, by + r)
      ctx.quadraticCurveTo(bx, by, bx + r, by)
      ctx.closePath()
      ctx.fill()

      barPositions.push({ x: bx, y: by, w: bw, h: bh, i, label: d.label })
    })

    ctx.fillStyle = '#7090b0'
    ctx.font = `${fontSize}px system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    for (const d of items) {
      ctx.fillText(d.label, (xScale(d.label) ?? 0) + xScale.bandwidth() / 2, height - mb + 6)
    }
  }

  drawBase()

  // Snapshot base render — putImageData restores it before every tooltip overlay.
  // getImageData/putImageData operate in device pixels; the dpr transform stays active
  // for subsequent draw calls, so tooltip coordinates remain in CSS-pixel space.
  const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height)

  const handleMouseMove = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect()
    // drei's <Html transform> CSS-scales the panel; offsetWidth is the layout
    // width (CSS px) while rect.width is the visual width after the transform.
    // Dividing converts viewport-relative coords into canvas CSS-pixel coords.
    const scaleX = canvas.offsetWidth / rect.width
    const scaleY = canvas.offsetHeight / rect.height
    const mx = (e.clientX - rect.left) * scaleX
    const my = (e.clientY - rect.top) * scaleY

    let hovered: BarHit | null = null
    for (const bar of barPositions) {
      if (mx >= bar.x && mx <= bar.x + bar.w && my >= bar.y && my <= bar.y + bar.h) {
        hovered = bar
        break
      }
    }

    ctx.putImageData(snapshot, 0, 0)
    if (hovered) {
      const item = items[hovered.i]
      drawTooltip(ctx, mx, my, [
        item.label,
        formatTooltipValue(item.value),
      ], width, height, tooltipFontSize)
    }
  }

  const handleMouseLeave = () => { ctx.putImageData(snapshot, 0, 0) }

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
