import * as d3 from 'd3'
import type { ProductRevenue } from '../../../types/index.ts'

const COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#f43f5e']

type BarHit = { x: number; y: number; w: number; h: number; i: number; product: string }

/**
 * Draws a bar chart using D3 + Canvas 2D API.
 * Returns a cleanup function when interactive (removes event listeners).
 * Safe to call in the VR texture pipeline — no DOM visibility required.
 */
export function drawBarChart(
  canvas: HTMLCanvasElement,
  products: ProductRevenue[],
  width: number,
  height: number,
  onItemClick?: (index: number, product: string) => void,
): (() => void) | void {
  const ctx = canvas.getContext('2d')
  if (!ctx || products.length === 0) return

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

  const xScale = d3
    .scaleBand()
    .domain(products.map((d) => d.product))
    .range([ml, width - mr])
    .padding(0.25)

  const maxRevenue = d3.max(products, (d) => d.revenue) ?? 0
  const yScale = d3
    .scaleLinear()
    .domain([0, maxRevenue * 1.1])
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

  // Bars + positions for hit-testing
  const barPositions: BarHit[] = []
  products.forEach((d, i) => {
    const bx = xScale(d.product) ?? 0
    const bw = xScale.bandwidth()
    const by = yScale(d.revenue)
    const bh = height - mb - by
    const r = Math.min(4, bw / 2)

    ctx.fillStyle = COLORS[i % COLORS.length]
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

    barPositions.push({ x: bx, y: by, w: bw, h: bh, i, product: d.product })
  })

  // X-axis labels
  ctx.fillStyle = '#7090b0'
  ctx.font = `${fontSize}px system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  for (const d of products) {
    ctx.fillText(d.product, (xScale(d.product) ?? 0) + xScale.bandwidth() / 2, height - mb + 6)
  }

  if (!onItemClick) return

  canvas.style.cursor = 'pointer'
  const handleClick = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    for (const bar of barPositions) {
      if (mx >= bar.x && mx <= bar.x + bar.w && my >= bar.y && my <= bar.y + bar.h) {
        e.stopPropagation()
        onItemClick(bar.i, bar.product)
        break
      }
    }
  }
  canvas.addEventListener('click', handleClick)
  return () => {
    canvas.removeEventListener('click', handleClick)
    canvas.style.cursor = ''
  }
}
