/**
 * Draws a tooltip fixed to the top-right corner of the canvas.
 *
 * A fixed corner avoids the coordinate-space mismatches that arise when
 * drei's <Html transform> CSS-scales the panel (getBoundingClientRect returns
 * scaled viewport pixels while canvas drawing uses CSS-pixel coordinates).
 *
 * @param ctx     - Active 2D context (coordinate system in CSS pixels via dpr scale)
 * @param lines   - Text lines; first line is rendered as a bold header
 * @param canvasW - Canvas CSS width
 * @param canvasH - Canvas CSS height (unused — kept for call-site compat)
 * @param fontSize - Base font size in CSS pixels
 */
export function drawTooltip(
  ctx: CanvasRenderingContext2D,
  _x: number,        // cursor position kept in signature for call-site compat
  _y: number,
  lines: string[],
  canvasW: number,
  _canvasH: number,
  fontSize: number,
) {
  if (lines.length === 0) return

  const padX = 10
  const padY = 7
  const lineH = fontSize + 4

  ctx.font = `${fontSize}px system-ui, sans-serif`
  ctx.textBaseline = 'top'
  const maxTextW = Math.max(...lines.map((l) => ctx.measureText(l).width))
  const boxW = maxTextW + padX * 2
  const boxH = lines.length * lineH + padY * 2 - 2

  // Fixed top-right — always visible regardless of cursor or CSS scale
  const margin = 8
  const tx = canvasW - boxW - margin
  const ty = margin

  const r = 6
  ctx.beginPath()
  ctx.moveTo(tx + r, ty)
  ctx.lineTo(tx + boxW - r, ty)
  ctx.quadraticCurveTo(tx + boxW, ty, tx + boxW, ty + r)
  ctx.lineTo(tx + boxW, ty + boxH - r)
  ctx.quadraticCurveTo(tx + boxW, ty + boxH, tx + boxW - r, ty + boxH)
  ctx.lineTo(tx + r, ty + boxH)
  ctx.quadraticCurveTo(tx, ty + boxH, tx, ty + boxH - r)
  ctx.lineTo(tx, ty + r)
  ctx.quadraticCurveTo(tx, ty, tx + r, ty)
  ctx.closePath()
  ctx.fillStyle = 'rgba(13, 21, 32, 0.96)'
  ctx.fill()
  ctx.strokeStyle = '#2a3a50'
  ctx.lineWidth = 1
  ctx.stroke()

  ctx.textAlign = 'left'
  lines.forEach((line, i) => {
    ctx.fillStyle = i === 0 ? '#e0ecff' : '#c0d0e0'
    ctx.font = i === 0
      ? `600 ${fontSize}px system-ui, sans-serif`
      : `${fontSize}px system-ui, sans-serif`
    ctx.fillText(line, tx + padX, ty + padY + i * lineH)
  })
}
