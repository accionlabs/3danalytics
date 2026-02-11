import { useCallback, useRef, useEffect } from 'react'
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
  onDrillTo?: (panelId: string) => void
  distanceFactor?: number
}

// Pixels per 3D unit for HTML content resolution.
// drei's <Html transform> maps: factor = 400 / distanceFactor.
// Setting distanceFactor = 400 / PX_PER_UNIT makes PX_PER_UNIT CSS pixels = 1 Three.js unit.
const PX_PER_UNIT = 200
const DEFAULT_DF = 400 / PX_PER_UNIT // = 2

/** Squared pixel threshold to distinguish click from drag */
const DRAG_THRESHOLD_SQ = 25 // 5px

export function DashboardPanel({
  config,
  target,
  isDimmed,
  onFocus,
  onItemClick,
  onDrillTo,
  distanceFactor = DEFAULT_DF,
}: DashboardPanelProps) {

  const spring = useSpring({
    position: target.position,
    rotation: target.rotation,
    scale: target.scale,
    from: { position: target.position, rotation: target.rotation, scale: 0 },
    config: { mass: 1, tension: 80, friction: 26 },
  })

  const panelRef = useRef<HTMLDivElement>(null)
  const pointerStart = useRef<{ x: number; y: number; id: number } | null>(null)
  const dragging = useRef(false)

  // Click on the panel — navigates camera to this panel (or away if already focused).
  // Only fires for genuine clicks (not drags), because the browser only emits onClick
  // when pointerdown and pointerup occur on the same element without significant movement.
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onFocus()
    },
    [onFocus],
  )

  // ── Pointer event forwarding for drag-to-pan ──
  // CameraController's drag handler listens on the <canvas>.  When the
  // pointer is over an <Html> overlay the canvas never sees pointerdown.
  // We detect when the user starts dragging (movement > threshold) and:
  //   1. Make this panel transparent to pointer events
  //   2. Dispatch a synthetic pointerdown on the canvas
  // The canvas handler then takes over via setPointerCapture.
  // For a plain click (no drag), onClick fires normally.

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return // touch handled at window level
    pointerStart.current = { x: e.clientX, y: e.clientY, id: e.pointerId }
    dragging.current = false
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!pointerStart.current || dragging.current || e.pointerType === 'touch') return
    const dx = e.clientX - pointerStart.current.x
    const dy = e.clientY - pointerStart.current.y
    if (dx * dx + dy * dy < DRAG_THRESHOLD_SQ) return

    dragging.current = true
    // Make panel transparent so the canvas receives subsequent pointer events
    if (panelRef.current) panelRef.current.style.pointerEvents = 'none'
    // Start the canvas drag handler with a synthetic pointerdown
    const canvas = document.querySelector('canvas')
    if (canvas) {
      canvas.dispatchEvent(new PointerEvent('pointerdown', {
        clientX: pointerStart.current.x,
        clientY: pointerStart.current.y,
        pointerId: pointerStart.current.id,
        pointerType: e.pointerType,
        bubbles: true,
        cancelable: true,
      }))
    }
  }, [])

  // Restore pointer-events on the panel after a drag ends
  useEffect(() => {
    const restore = () => {
      if (dragging.current && panelRef.current) {
        panelRef.current.style.pointerEvents = 'auto'
      }
      dragging.current = false
      pointerStart.current = null
    }
    window.addEventListener('pointerup', restore)
    window.addEventListener('pointercancel', restore)
    return () => {
      window.removeEventListener('pointerup', restore)
      window.removeEventListener('pointercancel', restore)
    }
  }, [])

  // ── Wheel forwarding ──
  // drei's <Html> renders into a separate React root whose DOM sits above the
  // canvas.  Wheel events on the panel div may not reliably bubble to window
  // (where CameraController listens).  Use a native DOM listener to intercept
  // the event, stop it from propagating (preventing double-handling), and
  // re-dispatch a clean copy directly on window.
  useEffect(() => {
    const el = panelRef.current
    if (!el) return
    const forwardWheel = (e: WheelEvent) => {
      e.stopPropagation()
      window.dispatchEvent(new WheelEvent('wheel', {
        deltaX: e.deltaX,
        deltaY: e.deltaY,
        deltaMode: e.deltaMode,
        clientX: e.clientX,
        clientY: e.clientY,
        ctrlKey: e.ctrlKey,
        metaKey: e.metaKey,
        shiftKey: e.shiftKey,
        bubbles: false,
        cancelable: true,
      }))
    }
    el.addEventListener('wheel', forwardWheel, { passive: false })
    return () => el.removeEventListener('wheel', forwardWheel)
  }, [])

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
        style={{ pointerEvents: 'none' }}
      >
        <div
          ref={panelRef}
          onClick={handleClick}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
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
            pointerEvents: 'auto',
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
                onDrillTo={onDrillTo}
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
