import { useState, useEffect, useRef, useCallback } from 'react'
import type { ChartRendererProps } from '../../types/index.ts'
import type { EmbedConfig } from '../../types/index.ts'

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

export function EmbedPanel({ data, width, height, onItemClick, onDrillTo }: ChartRendererProps) {
  const config = data as EmbedConfig
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const pointerStart = useRef<{ x: number; y: number } | null>(null)

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
          onLoad={() => setLoading(false)}
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
    </div>
  )
}
