import * as THREE from 'three'
import { dataUrlToTexture } from './svgToTexture.ts'

/** Timeout for iframe to respond with analytics:frame */
const CAPTURE_TIMEOUT_MS = 3000
/** Re-capture interval */
const RECAPTURE_INTERVAL_MS = 2000

/** Message sent parent → iframe to request a screenshot */
export interface CaptureRequest {
  type: 'analytics:capture'
  width: number
  height: number
}

/** Message sent iframe → parent with the screenshot */
export interface CaptureResponse {
  type: 'analytics:frame'
  panelId: string
  dataUrl: string
}

function isCaptureResponse(data: unknown): data is CaptureResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as Record<string, unknown>).type === 'analytics:frame' &&
    typeof (data as Record<string, unknown>).panelId === 'string' &&
    typeof (data as Record<string, unknown>).dataUrl === 'string'
  )
}

interface ManagedCapture {
  panelId: string
  iframe: HTMLIFrameElement
  intervalId: number
  pending: boolean
}

/**
 * Manages the analytics:capture / analytics:frame lifecycle for all embed panels.
 * - Sends capture requests to iframes
 * - Listens for responses and converts to textures
 * - Retries on an interval
 * - Generates fallback textures for non-responsive iframes
 */
export class EmbedCaptureManager {
  private captures = new Map<string, ManagedCapture>()
  private textures = new Map<string, THREE.CanvasTexture>()
  private onUpdate: (panelId: string, texture: THREE.CanvasTexture) => void
  private messageHandler: (event: MessageEvent) => void

  constructor(onUpdate: (panelId: string, texture: THREE.CanvasTexture) => void) {
    this.onUpdate = onUpdate
    this.messageHandler = this.handleMessage.bind(this)
    window.addEventListener('message', this.messageHandler)
  }

  /** Register an iframe for capture */
  register(panelId: string, iframe: HTMLIFrameElement, width: number, height: number) {
    if (this.captures.has(panelId)) return

    // Send initial capture request
    this.sendCapture(iframe, width, height)

    // Set up fallback timeout
    const timeoutId = window.setTimeout(() => {
      if (!this.textures.has(panelId)) {
        // No response — generate fallback texture
        this.generateFallback(panelId, width, height)
      }
    }, CAPTURE_TIMEOUT_MS)

    // Set up recurring capture
    const intervalId = window.setInterval(() => {
      this.sendCapture(iframe, width, height)
    }, RECAPTURE_INTERVAL_MS)

    this.captures.set(panelId, {
      panelId,
      iframe,
      intervalId,
      pending: true,
    })

    // Clean up timeout when response arrives (handled in handleMessage)
    void timeoutId
  }

  /** Stop capturing all panels */
  dispose() {
    window.removeEventListener('message', this.messageHandler)
    for (const capture of this.captures.values()) {
      clearInterval(capture.intervalId)
    }
    this.captures.clear()
    for (const texture of this.textures.values()) {
      texture.dispose()
    }
    this.textures.clear()
  }

  private sendCapture(iframe: HTMLIFrameElement, width: number, height: number) {
    iframe.contentWindow?.postMessage(
      { type: 'analytics:capture', width, height } satisfies CaptureRequest,
      '*',
    )
  }

  private async handleMessage(event: MessageEvent) {
    if (!isCaptureResponse(event.data)) return
    const { panelId, dataUrl } = event.data

    const capture = this.captures.get(panelId)
    if (!capture) return
    capture.pending = false

    try {
      const texture = await dataUrlToTexture(dataUrl, 512, 512)
      // Dispose old texture if replacing
      this.textures.get(panelId)?.dispose()
      this.textures.set(panelId, texture)
      this.onUpdate(panelId, texture)
    } catch {
      // Data URL was invalid — use fallback
      if (!this.textures.has(panelId)) {
        this.generateFallback(panelId, 512, 512)
      }
    }
  }

  private generateFallback(panelId: string, width: number, height: number) {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!

    // Dark background
    ctx.fillStyle = '#101830'
    ctx.fillRect(0, 0, width, height)

    // Border
    ctx.strokeStyle = '#283864'
    ctx.lineWidth = 2
    ctx.strokeRect(1, 1, width - 2, height - 2)

    // Panel ID text
    ctx.fillStyle = '#607090'
    ctx.font = '14px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(panelId, width / 2, height / 2 - 12)

    // Hint text
    ctx.fillStyle = '#405060'
    ctx.font = '11px system-ui, sans-serif'
    ctx.fillText('Open in 2D for full view', width / 2, height / 2 + 12)

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.needsUpdate = true
    this.textures.set(panelId, texture)
    this.onUpdate(panelId, texture)
  }
}
