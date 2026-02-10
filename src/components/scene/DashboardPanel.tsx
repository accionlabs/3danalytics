import { useCallback } from 'react'
import { animated, useSpring } from '@react-spring/three'
import { Html } from '@react-three/drei'
import { getChartRenderer } from '../../registry/chartRegistry.ts'
import type { PanelConfig, PanelPosition } from '../../types/index.ts'

interface DashboardPanelProps {
  config: PanelConfig
  target: PanelPosition
  isDimmed: boolean
  onFocus: () => void
  onItemClick?: (index: number) => void
  onDrillOut?: () => void
  distanceFactor?: number
}

// Pixels per 3D unit for HTML content resolution.
// drei's <Html transform> maps: factor = 400 / distanceFactor.
// Setting distanceFactor = 400 / PX_PER_UNIT makes PX_PER_UNIT CSS pixels = 1 Three.js unit.
const PX_PER_UNIT = 200
const DEFAULT_DF = 400 / PX_PER_UNIT // = 2

export function DashboardPanel({
  config,
  target,
  isDimmed,
  onFocus,
  onItemClick,
  onDrillOut,
  distanceFactor = DEFAULT_DF,
}: DashboardPanelProps) {

  const spring = useSpring({
    position: target.position,
    rotation: target.rotation,
    scale: target.scale,
    from: { position: target.position, rotation: target.rotation, scale: 0 },
    config: { mass: 1, tension: 80, friction: 26 },
  })

  // Click on the panel — navigates camera to this panel (or away if already focused)
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onFocus()
    },
    [onFocus],
  )

  // Right-click — drill out to parent
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      onDrillOut?.()
    },
    [onDrillOut],
  )

  const ChartComponent = getChartRenderer(config.chartType)
  const pixelWidth = Math.round(config.size.width * PX_PER_UNIT)
  const pixelHeight = Math.round(config.size.height * PX_PER_UNIT)
  const titleFontSize = Math.max(11, Math.round(pixelWidth * 0.026))
  const titlePadding = Math.max(6, Math.round(pixelWidth * 0.015))
  const contentPadding = Math.max(8, Math.round(pixelWidth * 0.018))

  return (
    <animated.group
      position={spring.position as unknown as [number, number, number]}
      rotation={spring.rotation as unknown as [number, number, number]}
      scale={spring.scale}
    >
      <Html
        transform
        distanceFactor={distanceFactor}
        position={[0, 0, 0.01]}
        center
        zIndexRange={[9000, 0]}
        style={{ pointerEvents: 'auto' }}
      >
        <div
          onClick={handleClick}
          onContextMenu={handleContextMenu}
          style={{
            width: pixelWidth,
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '10px',
            border: '1px solid rgba(40, 60, 100, 0.4)',
            background: 'rgba(8, 12, 28, 0.92)',
            boxShadow:
              '0 0 20px rgba(32, 96, 160, 0.15), inset 0 0 30px rgba(10, 15, 30, 0.5)',
            overflow: 'hidden',
            fontFamily: 'system-ui, sans-serif',
            cursor: 'pointer',
            touchAction: 'none',
          }}
        >
          {/* Dim overlay for non-focused panels */}
          {isDimmed && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(255, 255, 255, 0.2)',
                borderRadius: '10px',
                pointerEvents: 'none',
                zIndex: 1,
              }}
            />
          )}

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
          <div style={{ padding: `${contentPadding}px`, flex: 1 }}>
            {ChartComponent ? (
              <ChartComponent
                data={config.data}
                width={pixelWidth - contentPadding * 2}
                height={pixelHeight - contentPadding * 2}
                onItemClick={onItemClick}
              />
            ) : (
              <div
                style={{
                  color: '#607090',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: pixelHeight - contentPadding * 2,
                  fontSize: `${titleFontSize}px`,
                }}
              >
                Unknown chart: {config.chartType}
              </div>
            )}
          </div>
        </div>
      </Html>
    </animated.group>
  )
}
