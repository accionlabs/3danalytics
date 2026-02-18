/**
 * VR chart texture renderer.
 *
 * All charts are rendered via Canvas2D (no WebGPU) because browsers do not
 * allow creating a WebGPU context while a WebXR session is active.  The
 * desktop panels continue to use ChartGPU via the useChartGPU hook.
 *
 * Chart type → renderer mapping:
 *   revenue  → drawLineTexture  (multi-line, one line per numeric field)
 *   churn    → drawAreaTexture  (filled area, first numeric field)
 *   bar      → drawBarTexture   (vertical bars, first numeric field)
 *   kpi      → drawKpiTexture   (metric cards)
 *   funnel   → drawFunnelTexture (horizontal bar funnel)
 *   cohort   → drawCohortTexture (heatmap grid)
 *   embed    → fallback placeholder
 *   unknown  → auto-detect: multi-field → line, single-field → bar
 */
import { useEffect, useRef } from 'react'
import type { PanelConfig } from '../types/index.ts'
import {
  drawLineTexture,
  drawAreaTexture,
  drawBarTexture,
  drawKpiTexture,
  drawFunnelTexture,
  drawCohortTexture,
} from './canvasChartRenderers.ts'
import { setVRTexture } from '../components/xr/VRPanel.tsx'
import { createFallbackTexture } from './fallbackTexture.ts'

/** Texture resolution — power-of-2 for GPU efficiency */
const TEX_SIZE = 512

interface ChartGPUOffscreenRendererProps {
  panels: PanelConfig[]
  /** Only render when entering VR mode */
  active: boolean
}

/**
 * Mounts as a React no-op (renders nothing) but kicks off texture
 * generation for every panel whenever VR mode becomes active.
 */
export function ChartGPUOffscreenRenderer({ panels, active }: ChartGPUOffscreenRendererProps) {
  const capturedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!active) return

    for (const panel of panels) {
      if (capturedRef.current.has(panel.id)) continue
      capturedRef.current.add(panel.id)
      renderPanelToTexture(panel)
    }
  }, [active, panels])

  return null
}

// ─── Per-panel Canvas2D renderer ─────────────────────────────────────────────

function renderPanelToTexture(panel: PanelConfig): void {
  try {
    const texture = pickRenderer(panel)
    setVRTexture(panel.id, texture)
    console.log(`[VR] Rendered ${panel.chartType}: ${panel.title}`)
  } catch (err) {
    console.error(`[VR] Failed to render ${panel.title}:`, err)
    setVRTexture(panel.id, createFallbackTexture(panel.title, panel.chartType))
  }
}

function pickRenderer(panel: PanelConfig) {
  const { chartType, data, title } = panel

  switch (chartType) {
    case 'revenue':
      return drawLineTexture(data, title, TEX_SIZE)

    case 'churn':
      return drawAreaTexture(data, title, TEX_SIZE)

    case 'bar':
      return drawBarTexture(data, title, TEX_SIZE)

    case 'kpi':
      return drawKpiTexture(data, title, TEX_SIZE)

    case 'funnel':
      return drawFunnelTexture(data, title, TEX_SIZE)

    case 'cohort':
      return drawCohortTexture(data, title, TEX_SIZE)

    case 'embed':
      return createFallbackTexture(title, chartType)

    default: {
      // Unknown type from API — auto-detect based on data shape
      const records = Array.isArray(data)
        ? (data as Record<string, unknown>[]).filter(Boolean)
        : []
      const numKeys = records.length > 0
        ? Object.keys(records[0]).filter((k) => typeof records[0][k] === 'number')
        : []
      return numKeys.length > 1
        ? drawLineTexture(data, title, TEX_SIZE)
        : drawBarTexture(data, title, TEX_SIZE)
    }
  }
}
