import type { KpiCardItem } from '../../../types/chartData.ts'

function trendArrow(direction: 'up' | 'down' | 'flat'): string {
  if (direction === 'up') return '▲'
  if (direction === 'down') return '▼'
  return '▬'
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
 * Generic implementation — accepts any KPI items with pre-formatted values.
 * Returns a cleanup function when interactive (removes event listeners).
 * Safe to call in the VR texture pipeline — no DOM visibility required.
 */
export function drawKpiCard(
  canvas: HTMLCanvasElement,
  items: KpiCardItem[],
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

  // Background
  ctx.fillStyle = '#080c1c'
  ctx.fillRect(0, 0, width, height)

  const cols = items.length <= 3 ? items.length : Math.ceil(items.length / 2)
  const rows = Math.ceil(items.length / cols)
  const gap = Math.round(width * 0.025)
  const padX = Math.round(width * 0.03)
  const padY = Math.round(height * 0.03)
  const cardW = Math.floor((width - padX * 2 - gap * (cols - 1)) / cols)
  const cardH = Math.floor((height - padY * 2 - gap * (rows - 1)) / rows)

  const labelSize = Math.max(10, Math.round(width * 0.022))
  const valueSize = Math.max(16, Math.round(width * 0.055))
  const trendSize = Math.max(10, Math.round(width * 0.022))

  const cardHits: CardHit[] = []

  items.forEach((item, i) => {
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

    // Layout: center text lines vertically inside the card
    const innerPadX = Math.round(cardW * 0.1)
    const hasTrend = !!item.trend
    const totalTextHeight = hasTrend
      ? labelSize + valueSize + trendSize + 10
      : labelSize + valueSize + 4
    const textStartY = cy + (cardH - totalTextHeight) / 2

    // Label
    ctx.fillStyle = '#6080a0'
    ctx.font = `${labelSize}px system-ui, sans-serif`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(item.label, cx + innerPadX, textStartY, cardW - innerPadX * 2)

    // Value (pre-formatted string)
    ctx.fillStyle = '#e0e8f0'
    ctx.font = `700 ${valueSize}px system-ui, sans-serif`
    ctx.textBaseline = 'top'
    ctx.fillText(item.value, cx + innerPadX, textStartY + labelSize + 4, cardW - innerPadX * 2)

    // Trend (optional)
    if (hasTrend) {
      const trendY = textStartY + labelSize + 4 + valueSize + 6
      const color = item.trend!.color
      ctx.font = `${trendSize}px system-ui, sans-serif`
      ctx.fillStyle = color
      ctx.textBaseline = 'top'
      const arrow = trendArrow(item.trend!.direction)
      ctx.fillText(arrow, cx + innerPadX, trendY)
      const arrowW = ctx.measureText(arrow + ' ').width
      ctx.fillText(item.trend!.value, cx + innerPadX + arrowW, trendY)
    }

    cardHits.push({ x: cx, y: cy, w: cardW, h: cardH, i, label: item.label })
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

    items.forEach((item, i) => {
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
      const hasTrend = !!item.trend
      const totalTextHeight = hasTrend
        ? labelSize + valueSize + trendSize + 10
        : labelSize + valueSize + 4
      const textStartY = card.y + (card.h - totalTextHeight) / 2

      ctx.fillStyle = '#6080a0'
      ctx.font = `${labelSize}px system-ui, sans-serif`
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.fillText(item.label, card.x + innerPadX, textStartY, card.w - innerPadX * 2)

      ctx.fillStyle = '#e0e8f0'
      ctx.font = `700 ${valueSize}px system-ui, sans-serif`
      ctx.fillText(item.value, card.x + innerPadX, textStartY + labelSize + 4, card.w - innerPadX * 2)

      if (hasTrend) {
        const trendY = textStartY + labelSize + 4 + valueSize + 6
        const color = item.trend!.color
        ctx.font = `${trendSize}px system-ui, sans-serif`
        ctx.fillStyle = color
        const arrow = trendArrow(item.trend!.direction)
        ctx.fillText(arrow, card.x + innerPadX, trendY)
        const arrowW = ctx.measureText(arrow + ' ').width
        ctx.fillText(item.trend!.value, card.x + innerPadX + arrowW, trendY)
      }
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
