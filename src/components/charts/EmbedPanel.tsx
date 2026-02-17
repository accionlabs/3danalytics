import { useState, useEffect, useRef, useCallback } from 'react'
import type { ChartRendererProps } from '../../types/index.ts'
import type { EmbedConfig } from '../../types/index.ts'
import { dataUrlToTexture } from '../../xr/svgToTexture.ts'
import { setVRTexture } from '../xr/VRPanel.tsx'

/** Re-capture interval for web-mode thumbnail (ms) */
const WEB_RECAPTURE_INTERVAL_MS = 2000

/** Parse analytics:frame payload — handles direct data-URL string or objects
 *  with varying key names, matching the format emitted by the reports app. */
function parseFrameDataUrl(payload: unknown): string | null {
  if (typeof payload === 'string' && payload.startsWith('data:image')) {
    return payload
  }
  if (typeof payload === 'object' && payload !== null) {
    const obj = payload as Record<string, unknown>
    const candidate = obj.dataUrl ?? obj.image ?? obj.png ?? obj.url ?? obj.data
    if (typeof candidate === 'string' && candidate.startsWith('data:image')) {
      return candidate
    }
    // Last-resort: single-key object
    const keys = Object.keys(obj)
    if (keys.length === 1) {
      const val = obj[keys[0]]
      if (typeof val === 'string' && val.startsWith('data:image')) return val
    }
  }
  return null
}

const PROVIDER_LABELS: Record<string, string> = {
  powerbi: 'Power BI',
  tableau: 'Tableau',
  'looker-studio': 'Looker Studio',
  metabase: 'Metabase',
  looker: 'Looker',
  custom: 'Report',
}

/** Drill message sent by iframes via postMessage */
interface DrillMessage {
  type: 'analytics:drill'
  category?: string
  index?: number
  value?: unknown
}

function isDrillMessage(data: unknown): data is DrillMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as Record<string, unknown>).type === 'analytics:drill'
  )
}

/** Squared pixel threshold to distinguish click from drag */
const CLICK_THRESHOLD_SQ = 25 // 5px

export function EmbedPanel({ data, width, height, onItemClick, onDrillTo, panelId }: ChartRendererProps) {
  const config = data as EmbedConfig
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [captureDataUrl, setCaptureDataUrl] = useState<string | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const pointerStart = useRef<{ x: number; y: number } | null>(null)
  const captureIntervalRef = useRef<number | null>(null)

  const providerLabel = config.label ?? PROVIDER_LABELS[config.provider] ?? 'Embed'
  const sandboxValue = config.sandbox ?? 'allow-scripts allow-same-origin'

  // Listen for analytics:drill postMessages from the iframe
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      // Validate the message comes from our iframe
      if (iframeRef.current && event.source !== iframeRef.current.contentWindow) return
      if (!isDrillMessage(event.data)) return

      const { category, index } = event.data

      // 1. Category lookup via drillMap → direct panel navigation
      if (category && config.drillMap) {
        const targetId = config.drillMap[category]
        if (targetId) {
          onDrillTo?.(targetId)
          return
        }
      }

      // 2. Index fallback → positional child resolution
      if (index != null && onItemClick) {
        onItemClick(index, category)
        return
      }

      // 3. Category-only with onItemClick — pass index -1 as signal
      if (category && onItemClick) {
        onItemClick(-1, category)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [config.drillMap, onItemClick, onDrillTo])

  // ── Web-mode capture: postMessage handshake + screenshot polling ──
  // Protocol:
  //   1. On iframe load → ping (analytics:ping + analytics:hello) every 2s, max 10 attempts
  //   2. On analytics:ready / analytics:pong → stop pinging, send first capture, start interval
  //   3. On analytics:frame → parse data URL from msg.data (string or keyed object)
  const connectedRef = useRef(false)
  const pingAttemptsRef = useRef(0)
  const pingIntervalRef = useRef<number | null>(null)

  const sendCapture = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: 'analytics:capture', data: { format: 'dataUrl', quality: 0.9 } },
      '*',
    )
  }, [])

  const stopPing = useCallback(() => {
    if (pingIntervalRef.current !== null) {
      clearInterval(pingIntervalRef.current)
      pingIntervalRef.current = null
    }
  }, [])

  const startCapturing = useCallback(() => {
    if (connectedRef.current) return
    connectedRef.current = true
    stopPing()
    sendCapture()
    if (captureIntervalRef.current !== null) clearInterval(captureIntervalRef.current)
    captureIntervalRef.current = window.setInterval(sendCapture, WEB_RECAPTURE_INTERVAL_MS)
  }, [sendCapture, stopPing])

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (!iframeRef.current) return
      if (event.source !== iframeRef.current.contentWindow) return

      const msg = event.data as Record<string, unknown>
      if (!msg || typeof msg.type !== 'string') return

      switch (msg.type) {
        case 'analytics:ready':
        case 'analytics:pong':
          startCapturing()
          break

        case 'analytics:frame': {
          // data field holds the PNG: direct string or keyed object
          const dataUrl = parseFrameDataUrl(msg.data)
          if (dataUrl) setCaptureDataUrl(dataUrl)
          break
        }
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [startCapturing])

  // Cleanup all intervals on unmount
  useEffect(() => {
    return () => {
      stopPing()
      if (captureIntervalRef.current !== null) clearInterval(captureIntervalRef.current)
    }
  }, [stopPing])

  // Push each captured frame into the VR texture cache so VRPanel can display it
  useEffect(() => {
    if (!captureDataUrl || !panelId) return
    dataUrlToTexture(captureDataUrl, 512, 512)
      .then((texture) => setVRTexture(panelId, texture))
      .catch(() => { /* keep existing fallback texture on error */ })
  }, [captureDataUrl, panelId])

  // ── Overlay click-through ──
  // The overlay intercepts wheel/touch (so they reach the parent document and
  // CameraController), but clicks need to reach the iframe content for chart
  // drill-down.  On click (no drag), send analytics:click postMessage to the
  // iframe which simulates the click at those coordinates.
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    pointerStart.current = { x: e.clientX, y: e.clientY }
  }, [])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!pointerStart.current) return
    const dx = e.clientX - pointerStart.current.x
    const dy = e.clientY - pointerStart.current.y
    pointerStart.current = null

    // Only forward clicks, not drags
    if (dx * dx + dy * dy >= CLICK_THRESHOLD_SQ) return

    // Send click coordinates relative to the iframe viewport
    const iframe = iframeRef.current
    if (!iframe) return
    const rect = iframe.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    iframe.contentWindow?.postMessage(
      { type: 'analytics:click', x, y },
      '*',
    )
  }, [])

  return (
    <div
      style={{
        width,
        height,
        position: 'relative',
        background: '#080c1c',
        borderRadius: 4,
        overflow: 'hidden',
      }}
    >
      {/* Loading overlay */}
      {loading && !error && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#080c1c',
            color: '#6080a0',
            fontSize: 13,
            gap: 8,
            zIndex: 1,
          }}
        >
          <div
            style={{
              width: 24,
              height: 24,
              border: '2px solid rgba(59, 130, 246, 0.3)',
              borderTopColor: '#3b82f6',
              borderRadius: '50%',
              animation: 'embedSpin 0.8s linear infinite',
            }}
          />
          <span>Loading {providerLabel}...</span>
          <style>{`@keyframes embedSpin { to { transform: rotate(360deg) } }`}</style>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#080c1c',
            color: '#6080a0',
            fontSize: 13,
            zIndex: 1,
          }}
        >
          {config.fallbackMessage ?? `Unable to load ${providerLabel}`}
        </div>
      )}

      {/* Iframe */}
      {!error && (
        <iframe
          ref={iframeRef}
          src={config.url}
          title={providerLabel}
          sandbox={sandboxValue}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            display: loading ? 'none' : 'block',
          }}
          onLoad={() => {
            setLoading(false)
            // Reset handshake state for (re-)loads
            connectedRef.current = false
            pingAttemptsRef.current = 0
            stopPing()
            if (captureIntervalRef.current !== null) {
              clearInterval(captureIntervalRef.current)
              captureIntervalRef.current = null
            }
            // Ping until the analytics app signals ready (max 10 × 2 s = 20 s)
            const ping = () => {
              if (pingAttemptsRef.current >= 10) { stopPing(); return }
              pingAttemptsRef.current++
              iframeRef.current?.contentWindow?.postMessage({ type: 'analytics:ping' }, '*')
              iframeRef.current?.contentWindow?.postMessage({ type: 'analytics:hello' }, '*')
            }
            ping() // immediate first attempt
            pingIntervalRef.current = window.setInterval(ping, 2000)
          }}
          onError={() => { setLoading(false); setError(true) }}
        />
      )}

      {/* Transparent overlay — ensures wheel/touch events stay in the parent
          document (reaching CameraController), since events inside an iframe
          never cross the iframe boundary.  Clicks are forwarded to the iframe
          via postMessage so chart drill-down still works. */}
      {!error && !loading && (
        <div
          ref={overlayRef}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 2,
            touchAction: 'none',
          }}
        />
      )}

      {/* Captured PNG thumbnail — bottom-right corner, ~25% of panel size */}
      {captureDataUrl && (
        <img
          src={captureDataUrl}
          alt="capture"
          style={{
            position: 'absolute',
            bottom: 6,
            right: 6,
            width: Math.round((width ?? 200) * 0.25),
            height: Math.round((height ?? 150) * 0.25),
            objectFit: 'cover',
            borderRadius: 3,
            border: '1px solid rgba(96,160,255,0.4)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.6)',
            pointerEvents: 'none',
            zIndex: 3,
          }}
        />
      )}
    </div>
  )
}
