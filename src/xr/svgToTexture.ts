import * as THREE from 'three'

/**
 * Convert an SVG string into a Three.js CanvasTexture.
 *
 * Pipeline: SVG string → Blob → Image → Canvas → CanvasTexture
 * Uses only browser-native APIs — no external dependencies.
 */
export function svgToTexture(
  svgString: string,
  width: number,
  height: number,
): Promise<THREE.CanvasTexture> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const img = new Image()

    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)
      const texture = new THREE.CanvasTexture(canvas)
      texture.colorSpace = THREE.SRGBColorSpace
      texture.needsUpdate = true
      resolve(texture)
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load SVG as image'))
    }

    img.src = url
  })
}

/**
 * Convert a data URL (e.g. from html2canvas or analytics:frame) to a CanvasTexture.
 */
export function dataUrlToTexture(
  dataUrl: string,
  width: number,
  height: number,
): Promise<THREE.CanvasTexture> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)
      const texture = new THREE.CanvasTexture(canvas)
      texture.colorSpace = THREE.SRGBColorSpace
      texture.needsUpdate = true
      resolve(texture)
    }
    img.onerror = () => reject(new Error('Failed to load data URL as image'))
    img.src = dataUrl
  })
}
