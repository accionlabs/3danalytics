import { useCallback } from 'react'
import { animated, useSpring } from '@react-spring/three'
import { Text } from '@react-three/drei'
import type { PanelConfig, PanelPosition } from '../../types/index.ts'

interface DashboardPanelSimpleVRProps {
  config: PanelConfig
  target: PanelPosition
  isDimmed: boolean
  onFocus: () => void
  onItemClick?: (index: number) => void
  onDrillOut?: () => void
}

/**
 * Simplified VR panel that renders as a solid plane with text.
 * This ensures panels are visible in VR while we work on full chart rendering.
 */
export function DashboardPanelSimpleVR({
  config,
  target,
  isDimmed,
  onFocus,
  onDrillOut,
}: DashboardPanelSimpleVRProps) {
  const spring = useSpring({
    position: target.position,
    rotation: target.rotation,
    scale: target.scale,
    from: { position: target.position, rotation: target.rotation, scale: 0 },
    config: { mass: 1, tension: 80, friction: 26 },
  })

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

  // Color based on chart type for visual distinction
  const colors: Record<string, string> = {
    bar: '#4a5fc1',
    line: '#2e7d32',
    kpi: '#8e24aa',
    funnel: '#d84315',
    geo: '#00796b',
    default: '#455a64',
  }
  const panelColor = colors[config.chartType] || colors.default

  return (
    <animated.group
      name={`panel-${config.id}`}
      userData={{ panelId: config.id }}
      position={spring.position as unknown as [number, number, number]}
      rotation={spring.rotation as unknown as [number, number, number]}
      scale={spring.scale}
    >
      {/* Background panel - raycastable for VR interaction */}
      <mesh
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerOver={(e) => {
          e.stopPropagation()
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'default'
        }}
        position={[0, 0, 0]}
      >
        <planeGeometry args={[config.size.width, config.size.height]} />
        <meshBasicMaterial
          color={panelColor}
          opacity={isDimmed ? 0.5 : 1.0}
          transparent
          side={2}
        />
      </mesh>

      {/* Border */}
      <mesh position={[0, 0, 0.001]}>
        <planeGeometry args={[config.size.width + 0.02, config.size.height + 0.02]} />
        <meshBasicMaterial color="#6a7c9e" transparent opacity={0.6} side={2} />
      </mesh>

      {/* Title text */}
      <Text
        position={[0, config.size.height / 2 - 0.15, 0.01]}
        fontSize={0.12}
        color="white"
        anchorX="center"
        anchorY="middle"
        maxWidth={config.size.width - 0.2}
      >
        {config.title}
      </Text>

      {/* Chart type indicator */}
      <Text
        position={[0, 0, 0.01]}
        fontSize={0.08}
        color="#b0bec5"
        anchorX="center"
        anchorY="middle"
      >
        {config.chartType.toUpperCase()}
      </Text>

      {/* Segment label if exists */}
      {config.segmentLabel && (
        <Text
          position={[0, -config.size.height / 2 + 0.12, 0.01]}
          fontSize={0.07}
          color="#80deea"
          anchorX="center"
          anchorY="middle"
        >
          {config.segmentLabel}
        </Text>
      )}
    </animated.group>
  )
}
