import type { KpiMetric } from '../../../types/index.ts'

function formatValue(value: number, unit: string): string {
  if (unit === '$') {
    if (value >= 1000) return `$${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`
    return `$${value.toFixed(2)}`
  }
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
  return `${value}`
}

function trendArrow(direction: 'up' | 'down' | 'flat'): string {
  if (direction === 'up') return '▲'
  if (direction === 'down') return '▼'
  return '▬'
}

function trendColor(direction: 'up' | 'down' | 'flat'): string {
  if (direction === 'up') return '#10b981'
  if (direction === 'down') return '#f43f5e'
  return '#6b7280'
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

type CardHit = { x: number; y: number; w: number; h: number; i: number; label: string }

/**
 * Draws a KPI card grid using Canvas 2D API.
 * Returns a cleanup function when interactive (removes event listeners).
 * Safe to call in the VR texture pipeline — no DOM visibility required.
 */
export function drawKpiCard(
  canvas: HTMLCanvasElement,
  metrics: KpiMetric[],
  width: number,
  height: number,
  onItemClick?: (index: number, label: string) => void,
): (() => void) | void {
  if (metrics.length === 0) return
  const ctx = canvas.getContext('2d')!

  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  canvas.width = width * dpr
  canvas.height = height * dpr
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
  ctx.scale(dpr, dpr)

  // Background
  ctx.fillStyle = '#080c1c'
  ctx.fillRect(0, 0, width, height)

  const cols = metrics.length <= 3 ? metrics.length : Math.ceil(metrics.length / 2)
  const rows = Math.ceil(metrics.length / cols)
  const gap = Math.round(width * 0.025)
  const padX = Math.round(width * 0.03)
  const padY = Math.round(height * 0.03)
  const cardW = Math.floor((width - padX * 2 - gap * (cols - 1)) / cols)
  const cardH = Math.floor((height - padY * 2 - gap * (rows - 1)) / rows)

  const labelSize = Math.max(10, Math.round(width * 0.022))
  const valueSize = Math.max(16, Math.round(width * 0.055))
  const trendSize = Math.max(10, Math.round(width * 0.022))

  const cardHits: CardHit[] = []

  metrics.forEach((metric, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const cx = padX + col * (cardW + gap)
    const cy = padY + row * (cardH + gap)

    // Card background
    roundedRect(ctx, cx, cy, cardW, cardH, 8)
    ctx.fillStyle = 'rgba(20, 30, 50, 0.8)'
    ctx.fill()

    // Card border
    roundedRect(ctx, cx, cy, cardW, cardH, 8)
    ctx.strokeStyle = '#1e2a40'
    ctx.lineWidth = 1
    ctx.stroke()

    // Layout: center the three text lines vertically inside the card
    const innerPadX = Math.round(cardW * 0.1)
    const totalTextHeight = labelSize + valueSize + trendSize + 10  // 10 = spacing
    const textStartY = cy + (cardH - totalTextHeight) / 2

    // Label
    ctx.fillStyle = '#6080a0'
    ctx.font = `${labelSize}px system-ui, sans-serif`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(metric.label, cx + innerPadX, textStartY, cardW - innerPadX * 2)

    // Value
    ctx.fillStyle = '#e0e8f0'
    ctx.font = `700 ${valueSize}px system-ui, sans-serif`
    ctx.textBaseline = 'top'
    ctx.fillText(formatValue(metric.value, metric.unit), cx + innerPadX, textStartY + labelSize + 4, cardW - innerPadX * 2)

    // Trend arrow + percentage on same line
    const trendY = textStartY + labelSize + 4 + valueSize + 6
    const color = trendColor(metric.trendDirection)
    ctx.font = `${trendSize}px system-ui, sans-serif`
    ctx.fillStyle = color
    ctx.textBaseline = 'top'
    const arrow = trendArrow(metric.trendDirection)
    ctx.fillText(arrow, cx + innerPadX, trendY)
    const arrowW = ctx.measureText(arrow + ' ').width
    const trendStr = `${metric.trend > 0 ? '+' : ''}${metric.trend}%`
    ctx.fillText(trendStr, cx + innerPadX + arrowW, trendY)

    cardHits.push({ x: cx, y: cy, w: cardW, h: cardH, i, label: metric.label })
  })

  if (!onItemClick) return

  canvas.style.cursor = 'pointer'
  const handleClick = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.offsetWidth / rect.width
    const scaleY = canvas.offsetHeight / rect.height
    const mx = (e.clientX - rect.left) * scaleX
    const my = (e.clientY - rect.top) * scaleY
    for (const card of cardHits) {
      if (mx >= card.x && mx <= card.x + card.w && my >= card.y && my <= card.y + card.h) {
        e.stopPropagation()
        onItemClick(card.i, card.label)
        break
      }
    }
  }

  // Hover highlight
  const handleMouseMove = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.offsetWidth / rect.width
    const scaleY = canvas.offsetHeight / rect.height
    const mx = (e.clientX - rect.left) * scaleX
    const my = (e.clientY - rect.top) * scaleY
    // Redraw all cards, highlighting hovered one
    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = '#080c1c'
    ctx.fillRect(0, 0, width, height)

    metrics.forEach((metric, i) => {
      const card = cardHits[i]
      const hovered = mx >= card.x && mx <= card.x + card.w && my >= card.y && my <= card.y + card.h

      roundedRect(ctx, card.x, card.y, card.w, card.h, 8)
      ctx.fillStyle = 'rgba(20, 30, 50, 0.8)'
      ctx.fill()

      roundedRect(ctx, card.x, card.y, card.w, card.h, 8)
      ctx.strokeStyle = hovered ? '#3b82f6' : '#1e2a40'
      ctx.lineWidth = hovered ? 1.5 : 1
      ctx.stroke()

      const innerPadX = Math.round(card.w * 0.1)
      const totalTextHeight = labelSize + valueSize + trendSize + 10
      const textStartY = card.y + (card.h - totalTextHeight) / 2

      ctx.fillStyle = '#6080a0'
      ctx.font = `${labelSize}px system-ui, sans-serif`
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.fillText(metric.label, card.x + innerPadX, textStartY, card.w - innerPadX * 2)

      ctx.fillStyle = '#e0e8f0'
      ctx.font = `700 ${valueSize}px system-ui, sans-serif`
      ctx.fillText(formatValue(metric.value, metric.unit), card.x + innerPadX, textStartY + labelSize + 4, card.w - innerPadX * 2)

      const trendY = textStartY + labelSize + 4 + valueSize + 6
      const color = trendColor(metric.trendDirection)
      ctx.font = `${trendSize}px system-ui, sans-serif`
      ctx.fillStyle = color
      const arrow = trendArrow(metric.trendDirection)
      ctx.fillText(arrow, card.x + innerPadX, trendY)
      const arrowW = ctx.measureText(arrow + ' ').width
      ctx.fillText(`${metric.trend > 0 ? '+' : ''}${metric.trend}%`, card.x + innerPadX + arrowW, trendY)
    })
  }

  canvas.addEventListener('click', handleClick)
  canvas.addEventListener('mousemove', handleMouseMove)
  return () => {
    canvas.removeEventListener('click', handleClick)
    canvas.removeEventListener('mousemove', handleMouseMove)
    canvas.style.cursor = ''
  }
}
