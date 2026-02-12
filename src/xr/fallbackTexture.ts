import * as THREE from 'three'

const TEX_SIZE = 512
const PAD = 20

/** Generate a visible fallback texture with title and chart type */
export function createFallbackTexture(title: string, subtitle?: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = TEX_SIZE
  canvas.height = TEX_SIZE
  const ctx = canvas.getContext('2d')!

  // Solid visible background
  ctx.fillStyle = '#1a2744'
  ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE)

  // Bright border
  ctx.strokeStyle = '#4488cc'
  ctx.lineWidth = 4
  ctx.strokeRect(2, 2, TEX_SIZE - 4, TEX_SIZE - 4)

  // Decorative bar chart silhouette
  const barW = 40
  const barGap = 16
  const barHeights = [140, 220, 100, 180, 260]
  const totalW = barHeights.length * barW + (barHeights.length - 1) * barGap
  const startX = (TEX_SIZE - totalW) / 2
  const baseY = TEX_SIZE - 80

  for (let i = 0; i < barHeights.length; i++) {
    const x = startX + i * (barW + barGap)
    // Bar body
    ctx.fillStyle = '#2a5090'
    ctx.fillRect(x, baseY - barHeights[i], barW, barHeights[i])
    // Bar highlight
    ctx.fillStyle = '#3a70c0'
    ctx.fillRect(x, baseY - barHeights[i], barW, 4)
  }

  // Title — large and bright white
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 36px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // Word wrap
  const maxW = TEX_SIZE - PAD * 2
  const words = title.split(' ')
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxW) {
      if (line) lines.push(line)
      line = word
    } else {
      line = test
    }
  }
  if (line) lines.push(line)

  const lineH = 44
  const textY = 80
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], TEX_SIZE / 2, textY + i * lineH, maxW)
  }

  // Subtitle (chart type)
  if (subtitle) {
    ctx.fillStyle = '#80b0e0'
    ctx.font = '24px system-ui, sans-serif'
    ctx.fillText(subtitle, TEX_SIZE / 2, textY + lines.length * lineH + 16, maxW)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  return texture
}
