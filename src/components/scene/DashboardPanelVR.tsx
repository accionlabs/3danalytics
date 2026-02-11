import { useCallback, useRef, useEffect, useState } from 'react'
import { animated, useSpring } from '@react-spring/three'
import * as THREE from 'three'
import html2canvas from 'html2canvas'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { getChartRenderer } from '../../registry/chartRegistry.ts'
import type { PanelConfig, PanelPosition } from '../../types/index.ts'

interface DashboardPanelVRProps {
  config: PanelConfig
  target: PanelPosition
  isDimmed: boolean
  onFocus: () => void
  onItemClick?: (index: number) => void
  onDrillOut?: () => void
}

// Pixels per 3D unit for texture resolution
const PX_PER_UNIT = 200

/**
 * VR-compatible panel that renders charts to a texture using html2canvas.
 * This provides much better compatibility than SVG foreignObject approach.
 */
export function DashboardPanelVR({
  config,
  target,
  isDimmed,
  onFocus,
  onItemClick,
  onDrillOut,
}: DashboardPanelVRProps) {
  const spring = useSpring({
    position: target.position,
    rotation: target.rotation,
    scale: target.scale,
    from: { position: target.position, rotation: target.rotation, scale: 0 },
    config: { mass: 1, tension: 80, friction: 26 },
  })

  const meshRef = useRef<THREE.Mesh>(null)
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const rootRef = useRef<Root | null>(null)

  const ChartComponent = getChartRenderer(config.chartType)
  const pixelWidth = Math.round(config.size.width * PX_PER_UNIT)
  const pixelHeight = Math.round(config.size.height * PX_PER_UNIT)
  const titleFontSize = Math.max(14, Math.round(pixelWidth * 0.03))
  const titlePadding = Math.max(8, Math.round(pixelWidth * 0.02))
  const contentPadding = Math.max(10, Math.round(pixelWidth * 0.022))

  useEffect(() => {
    console.log(`[VR PANEL] Setting up chart rendering for "${config.title}"`)

    // Create hidden container for chart rendering
    const container = document.createElement('div')
    container.style.position = 'absolute'
    container.style.left = '-9999px'
    container.style.top = '-9999px'
    container.style.width = `${pixelWidth}px`
    container.style.height = `${pixelHeight}px`
    document.body.appendChild(container)
    containerRef.current = container

    // Create React root and render chart
    const root = createRoot(container)
    rootRef.current = root

    root.render(
      <div
        style={{
          width: pixelWidth,
          height: pixelHeight,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '10px',
          border: '1px solid rgba(40, 60, 100, 0.4)',
          background: 'rgba(8, 12, 28, 0.95)',
          boxShadow: '0 0 20px rgba(32, 96, 160, 0.15), inset 0 0 30px rgba(10, 15, 30, 0.5)',
          overflow: 'hidden',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Title bar */}
        <div
          style={{
            padding: `${titlePadding}px ${titlePadding + 4}px`,
            borderBottom: '1px solid rgba(40, 60, 100, 0.3)',
            color: '#c0d8f0',
            fontSize: `${titleFontSize}px`,
            fontWeight: 700,
            textShadow: '0 0 8px rgba(96, 160, 255, 0.4)',
          }}
        >
          {config.title}
        </div>

        {/* Chart content */}
        <div style={{ padding: `${contentPadding}px`, flex: 1, minHeight: 0 }}>
          {ChartComponent ? (
            <ChartComponent
              data={config.data}
              width={pixelWidth - contentPadding * 2}
              height={pixelHeight - titleFontSize - titlePadding * 2 - contentPadding * 2 - 10}
              onItemClick={onItemClick}
            />
          ) : (
            <div
              style={{
                color: '#607090',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                fontSize: `${titleFontSize}px`,
              }}
            >
              Unknown chart: {config.chartType}
            </div>
          )}
        </div>
      </div>,
    )

    // Capture and convert to texture
    const captureChart = async () => {
      if (!containerRef.current) return

      try {
        // Wait for chart to render completely
        await new Promise((resolve) => setTimeout(resolve, 800))

        const canvas = await html2canvas(containerRef.current, {
          backgroundColor: 'rgba(8, 12, 28, 0.95)',
          scale: 1.5, // High quality without being too heavy
          logging: false,
          useCORS: true,
          allowTaint: true,
        })

        const canvasTexture = new THREE.CanvasTexture(canvas)
        canvasTexture.needsUpdate = true
        canvasTexture.minFilter = THREE.LinearFilter
        canvasTexture.magFilter = THREE.LinearFilter
        canvasTexture.format = THREE.RGBAFormat

        setTexture(canvasTexture)
        console.log(`[VR PANEL] Texture successfully created for "${config.title}"`)
      } catch (error) {
        console.error(`[VR PANEL] Failed to capture chart for "${config.title}":`, error)
      }
    }

    // Initial capture
    captureChart()

    // Update texture every 3 seconds for dynamic content
    const interval = setInterval(captureChart, 3000)

    return () => {
      clearInterval(interval)
      if (rootRef.current) {
        rootRef.current.unmount()
        rootRef.current = null
      }
      if (containerRef.current && document.body.contains(containerRef.current)) {
        document.body.removeChild(containerRef.current)
        containerRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.id, pixelWidth, pixelHeight])

  // Separate effect for texture cleanup
  useEffect(() => {
    return () => {
      if (texture) {
        texture.dispose()
      }
    }
  }, [texture])

  const handleClick = useCallback(
    (e: any) => {
      e.stopPropagation()
      onFocus()
    },
    [onFocus],
  )

  const handlePointerDown = useCallback(
    (e: any) => {
      if (e.button === 2 || e.nativeEvent?.button === 2) {
        e.stopPropagation()
        onDrillOut?.()
      }
    },
    [onDrillOut],
  )

  return (
    <animated.group
      position={spring.position as unknown as [number, number, number]}
      rotation={spring.rotation as unknown as [number, number, number]}
      scale={spring.scale}
    >
      {/* Background panel */}
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[config.size.width, config.size.height]} />
        <meshBasicMaterial
          color="#0a0c1c"
          opacity={isDimmed ? 0.3 : 0.85}
          transparent
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Chart texture mesh */}
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        position={[0, 0, 0]}
      >
        <planeGeometry args={[config.size.width, config.size.height]} />
        {texture ? (
          <meshBasicMaterial
            map={texture}
            opacity={isDimmed ? 0.5 : 1.0}
            transparent
            side={THREE.DoubleSide}
          />
        ) : (
          <meshBasicMaterial
            color="#1e293b"
            opacity={isDimmed ? 0.4 : 0.7}
            transparent
            side={THREE.DoubleSide}
          />
        )}
      </mesh>

      {/* Border */}
      <mesh position={[0, 0, 0.001]}>
        <planeGeometry args={[config.size.width + 0.02, config.size.height + 0.02]} />
        <meshBasicMaterial
          color="#3b4a6b"
          transparent
          opacity={isDimmed ? 0.2 : 0.4}
          side={THREE.DoubleSide}
        />
      </mesh>
    </animated.group>
  )
}
