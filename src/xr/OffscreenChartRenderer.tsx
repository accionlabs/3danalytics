import { useEffect, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { getChartRenderer } from '../registry/chartRegistry.ts'
import type { PanelConfig } from '../types/index.ts'
import { htmlToSvgString } from './htmlToSvgString.ts'
import { svgToTexture } from './svgToTexture.ts'
import { createFallbackTexture } from './fallbackTexture.ts'
import { setVRTexture } from '../components/xr/VRPanel.tsx'

/** Texture resolution (power-of-2 for GPU efficiency) */
const TEX_SIZE = 512

interface OffscreenChartRendererProps {
  panels: PanelConfig[]
  active: boolean  // Only render when in VR
}

/**
 * Hidden DOM component that renders charts offscreen and converts them to textures.
 *
 * For local charts (chartType !== 'embed'): renders into hidden div, extracts SVG → texture.
 * For embed panels: creates fallback placeholder textures (iframes aren't available in VR).
 *
 * Textures are written into VRPanel's module-level cache via setVRTexture(),
 * which VRPanel picks up imperatively in useFrame (no React re-renders needed).
 */
export function OffscreenChartRenderer({ panels, active }: OffscreenChartRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const capturedRef = useRef<Set<string>>(new Set())

  // Render local charts offscreen → capture as textures
  useEffect(() => {
    if (!active || !containerRef.current) return

    const container = containerRef.current

    for (const panel of panels) {
      if (panel.chartType === 'embed') continue
      if (capturedRef.current.has(panel.id)) continue
      capturedRef.current.add(panel.id)

      const ChartComponent = getChartRenderer(panel.chartType)
      if (!ChartComponent) continue

      const wrapper = document.createElement('div')
      wrapper.style.cssText = `width:${TEX_SIZE}px;height:${TEX_SIZE}px;background:#080c1c;font-family:system-ui,sans-serif;`
      container.appendChild(wrapper)

      const root = createRoot(wrapper)

      root.render(
        <ChartComponent
          data={panel.data}
          width={TEX_SIZE - 16}
          height={TEX_SIZE - 16}
        />,
      )

      // Wait for React + Recharts to render, then capture
      setTimeout(() => {
        const svgStr = htmlToSvgString(wrapper, TEX_SIZE, TEX_SIZE)
        svgToTexture(svgStr, TEX_SIZE, TEX_SIZE)
          .then((texture) => {
            setVRTexture(panel.id, texture)
            console.log(`[OffscreenChartRenderer] Captured: ${panel.title}`)
          })
          .catch(() => {
            setVRTexture(panel.id, createFallbackTexture(panel.title))
          })
          .finally(() => {
            root.unmount()
            wrapper.remove()
          })
      }, 500)
    }
  }, [active, panels])

  if (!active) return null

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        opacity: 0,
        zIndex: -1,
      }}
    />
  )
}
