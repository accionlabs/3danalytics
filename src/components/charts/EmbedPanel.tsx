import { useState, useEffect, useRef } from 'react'
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

export function EmbedPanel({ data, width, height, onItemClick, onDrillTo }: ChartRendererProps) {
  const config = data as EmbedConfig
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

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
    </div>
  )
}
