import type { FunnelStageItem } from '../../../types/chartData.ts'
import { drawTooltip } from './tooltipHelper.ts'

const COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef']

type BarHit = { x: number; y: number; w: number; h: number; i: number; label: string }

/**
 * Draws a funnel chart using Canvas 2D API.
 * Renders horizontal bars with labels and conversion rates.
 * Returns a cleanup function (removes event listeners).
 * Safe to call in the VR texture pipeline — no DOM visibility required.
 */
export function drawFunnelChart(
  canvas: HTMLCanvasElement,
  stages: FunnelStageItem[],
  width: number,
  height: number,
  onItemClick?: (index: number, label: string) => void,
): (() => void) | void {
  if (stages.length === 0) return
  const ctx = canvas.getContext('2d')!

  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  canvas.width = width * dpr
  canvas.height = height * dpr
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
  ctx.scale(dpr, dpr)

  const maxCount = stages[0]?.value ?? 1
  const fontSize = Math.max(10, Math.round(width * 0.024))
  const labelHeight = fontSize + 8
  const barHeight = Math.max(12, Math.floor((height - stages.length * labelHeight) / stages.length) - 4)
  const paddingTop = 4
  const gap = 2
  const tooltipFontSize = Math.max(11, Math.round(width * 0.026))

  const barPositions: BarHit[] = []

  // Generic number formatter - adapts to value magnitude
  function formatValue(val: number): string {
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`
    if (val >= 1000) return `${(val / 1000).toFixed(0)}k`
    if (val % 1 === 0) return val.toLocaleString()
    return val.toFixed(1)
  }

  function drawBase() {
    // Clear and fill background
    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = '#080c1c'
    ctx.fillRect(0, 0, width, height)

    let currentY = paddingTop

    barPositions.length = 0

    stages.forEach((stage, i) => {
      const barWidth = Math.max(40, (stage.value / maxCount) * width)
      const barColor = stage.color || COLORS[i % COLORS.length]

      // Label row: stage name left, count + conversion rate right
      ctx.fillStyle = '#c0d0e0'
      ctx.font = `600 ${fontSize}px system-ui, sans-serif`
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.fillText(stage.label, 0, currentY)

      // Value and conversion rate (right-aligned)
      let valueText = formatValue(stage.value)
      if (stage.conversionRate !== undefined) {
        valueText += ` (${stage.conversionRate}%)`
      }
      ctx.fillStyle = '#8090b0'
      ctx.font = `${fontSize - 1}px system-ui, sans-serif`
      ctx.textAlign = 'right'
      ctx.fillText(valueText, width, currentY)

      currentY += labelHeight

      // Draw horizontal bar with gradient
      const barY = currentY
      const barX = 0

      // Create gradient (left to right, fading to semi-transparent)
      const gradient = ctx.createLinearGradient(barX, barY, barX + barWidth, barY)
      gradient.addColorStop(0, barColor)
      gradient.addColorStop(1, barColor + '88') // Add transparency to end

      ctx.fillStyle = gradient
      ctx.beginPath()
      const radius = Math.min(4, barHeight / 2)
      // Rounded right edge only
      ctx.moveTo(barX, barY)
      ctx.lineTo(barX + barWidth - radius, barY)
      ctx.quadraticCurveTo(barX + barWidth, barY, barX + barWidth, barY + radius)
      ctx.lineTo(barX + barWidth, barY + barHeight - radius)
      ctx.quadraticCurveTo(barX + barWidth, barY + barHeight, barX + barWidth - radius, barY + barHeight)
      ctx.lineTo(barX, barY + barHeight)
      ctx.closePath()
      ctx.fill()

      barPositions.push({
        x: barX,
        y: barY - labelHeight, // Include label area for hit detection
        w: Math.max(barWidth, width * 0.3), // Extend hit area for easier interaction
        h: barHeight + labelHeight,
        i,
        label: stage.label
      })

      currentY += barHeight + gap
    })
  }

  drawBase()

  // Snapshot base render for tooltip overlay
  const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height)

  const handleMouseMove = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect()
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
      const stage = stages[hovered.i]
      const tooltipLines = [
        stage.label,
        formatValue(stage.value),
      ]
      if (stage.conversionRate !== undefined) {
        tooltipLines.push(`Conversion: ${stage.conversionRate}%`)
      }
      drawTooltip(ctx, mx, my, tooltipLines, width, height, tooltipFontSize)
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
