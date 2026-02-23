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
      wrapper.style.cssText = `position:absolute;width:${TEX_SIZE}px;height:${TEX_SIZE}px;background:transparent;font-family:system-ui,sans-serif;`
      container.appendChild(wrapper)

      // Calculate dimensions for title bar and chart content
      const titleBarHeight = 40
      const titlePadding = 10
      const contentPadding = 12
      const chartWidth = TEX_SIZE - contentPadding * 2
      const chartHeight = TEX_SIZE - titleBarHeight - contentPadding * 2

      const root = createRoot(wrapper)
      root.render(
        <div
          style={{
            width: TEX_SIZE,
            height: TEX_SIZE,
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '10px',
            border: '1px solid rgba(40, 60, 100, 0.4)',
            background: 'rgba(8, 12, 28, 0.92)',
            overflow: 'hidden',
          }}
        >
          {/* Title bar - matching web version style */}
          <div
            style={{
              padding: `${titlePadding}px ${titlePadding + 4}px`,
              borderBottom: '1px solid rgba(40, 60, 100, 0.3)',
              color: '#c0d8f0',
              fontSize: '18px',
              fontWeight: 700,
              textShadow: '0 0 8px rgba(96, 160, 255, 0.4)',
              background: 'rgba(10, 15, 30, 0.8)',
              height: titleBarHeight,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {panel.title}
          </div>

          {/* Chart content */}
          <div style={{ padding: `${contentPadding}px`, flex: 1 }}>
            <ChartComponent data={panel.data} width={chartWidth} height={chartHeight} />
          </div>
        </div>,
      )

      // Allow React + useEffect to commit, then capture.
      // Timeout increased to 800ms — React 18 concurrent rendering + D3 drawing
      // can be slower when the browser is busy with 3D scene updates. This is
      // a one-time cost when entering VR, not user-visible.
      setTimeout(() => {
        const chartCanvas = wrapper.querySelector('canvas') as HTMLCanvasElement | null

        if (chartCanvas) {
          // Canvas-based chart - create composite texture with title bar
          const offscreen = document.createElement('canvas')
          offscreen.width = TEX_SIZE
          offscreen.height = TEX_SIZE
          const ctx = offscreen.getContext('2d')

          if (ctx) {
            // Draw panel background
            ctx.fillStyle = 'rgba(8, 12, 28, 0.92)'
            ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE)

            // Draw title bar background
            ctx.fillStyle = 'rgba(10, 15, 30, 0.8)'
            ctx.fillRect(0, 0, TEX_SIZE, titleBarHeight)

            // Draw title bar border
            ctx.strokeStyle = 'rgba(40, 60, 100, 0.3)'
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(0, titleBarHeight)
            ctx.lineTo(TEX_SIZE, titleBarHeight)
            ctx.stroke()

            // Draw title text
            ctx.fillStyle = '#c0d8f0'
            ctx.font = 'bold 18px system-ui, sans-serif'
            ctx.textBaseline = 'middle'
            ctx.shadowColor = 'rgba(96, 160, 255, 0.4)'
            ctx.shadowBlur = 8
            ctx.fillText(panel.title, 14, titleBarHeight / 2)
            ctx.shadowBlur = 0

            // Draw chart canvas below title bar
            const chartY = titleBarHeight + contentPadding
            ctx.drawImage(chartCanvas, contentPadding, chartY, chartWidth, chartHeight)

            // Verify content
            const sample = ctx.getImageData(0, 0, Math.min(100, TEX_SIZE), Math.min(100, TEX_SIZE))
            const hasContent = sample.data.some((val, i) => i % 4 === 3 && val > 10)

            if (hasContent) {
              const texture = new THREE.CanvasTexture(offscreen)
              texture.needsUpdate = true
              setVRTexture(panel.id, texture)
              console.log(`[OffscreenChartRenderer] Canvas texture with title: ${panel.title}`)
            } else {
              setVRTexture(panel.id, createFallbackTexture(panel.title))
            }
          } else {
            setVRTexture(panel.id, createFallbackTexture(panel.title))
          }
          root.unmount()
          wrapper.remove()
        } else {
          // HTML-based chart - use SVG path
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
      }, 800)
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
