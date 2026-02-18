import { useEffect, useRef } from 'react'
import * as THREE from 'three'
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
 * Hidden DOM component that renders charts offscreen and converts them to WebGL textures.
 *
 * Fast path (canvas-based charts — BarChart, RevenueChart, ChurnChart):
 *   Mounts the React component → finds its <canvas> element → copies pixels into a
 *   standalone canvas → creates THREE.CanvasTexture directly.
 *   No SVG serialisation, no intermediate blob, no forced delay.
 *
 * Fallback path (HTML-based charts — FunnelChart, CohortChart, KpiCard, GeoChart):
 *   Uses the original HTML→SVG→CanvasTexture pipeline with a 500 ms render delay.
 *
 * Embed panels (iframes) always receive a placeholder texture; iframes are
 * unavailable in immersive XR sessions.
 *
 * Textures are written into VRPanel's module-level cache via setVRTexture(),
 * which VRPanel picks up imperatively in useFrame (no React re-renders needed).
 */
export function OffscreenChartRenderer({ panels, active }: OffscreenChartRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const capturedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!active || !containerRef.current) return

    const container = containerRef.current

    for (const panel of panels) {
      if (panel.chartType === 'embed') {
        if (!capturedRef.current.has(panel.id)) {
          capturedRef.current.add(panel.id)
          setVRTexture(panel.id, createFallbackTexture(panel.title))
        }
        continue
      }

      if (capturedRef.current.has(panel.id)) continue
      capturedRef.current.add(panel.id)

      const ChartComponent = getChartRenderer(panel.chartType)
      if (!ChartComponent) continue

      const wrapper = document.createElement('div')
      wrapper.style.cssText = `position:absolute;width:${TEX_SIZE}px;height:${TEX_SIZE}px;background:#080c1c;font-family:system-ui,sans-serif;`
      container.appendChild(wrapper)

      const root = createRoot(wrapper)
      root.render(
        <ChartComponent data={panel.data} width={TEX_SIZE} height={TEX_SIZE} />,
      )

      // Allow React + useEffect to commit, then capture
      setTimeout(() => {
        const chartCanvas = wrapper.querySelector('canvas') as HTMLCanvasElement | null

        if (chartCanvas) {
          // Fast path: D3/canvas chart — copy pixels directly into a standalone
          // canvas so the texture stays valid after React unmounts the component.
          const offscreen = document.createElement('canvas')
          offscreen.width = chartCanvas.width
          offscreen.height = chartCanvas.height
          const copyCtx = offscreen.getContext('2d')
          if (copyCtx) {
            copyCtx.drawImage(chartCanvas, 0, 0)
            const texture = new THREE.CanvasTexture(offscreen)
            texture.needsUpdate = true
            setVRTexture(panel.id, texture)
            console.log(`[OffscreenChartRenderer] Canvas texture: ${panel.title}`)
          } else {
            setVRTexture(panel.id, createFallbackTexture(panel.title))
          }
          root.unmount()
          wrapper.remove()
        } else {
          // Fallback path: HTML-based chart — serialise to SVG then to texture
          const svgStr = htmlToSvgString(wrapper, TEX_SIZE, TEX_SIZE)
          svgToTexture(svgStr, TEX_SIZE, TEX_SIZE)
            .then((texture) => {
              setVRTexture(panel.id, texture)
              console.log(`[OffscreenChartRenderer] SVG texture: ${panel.title}`)
            })
            .catch(() => {
              setVRTexture(panel.id, createFallbackTexture(panel.title))
            })
            .finally(() => {
              root.unmount()
              wrapper.remove()
            })
        }
      }, 150)
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
        width: '1px',
        height: '1px',
        overflow: 'hidden',
        pointerEvents: 'none',
        opacity: 0,
        zIndex: -1,
      }}
    />
  )
}
