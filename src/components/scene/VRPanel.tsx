import { useRef } from 'react'
import { animated, useSpring } from '@react-spring/three'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import type { PanelConfig, PanelPosition } from '../../types/index.ts'

interface VRPanelProps {
  config: PanelConfig
  target: PanelPosition
  isDimmed: boolean
  onFocus: () => void
}

/**
 * VR-compatible panel using actual 3D geometry instead of HTML overlays.
 * Renders as a textured plane with title and basic info visible in VR.
 */
export function VRPanel({ config, target, isDimmed, onFocus }: VRPanelProps) {
  const meshRef = useRef<THREE.Mesh>(null)

  const spring = useSpring({
    position: target.position,
    rotation: target.rotation,
    scale: target.scale,
    from: { position: target.position, rotation: target.rotation, scale: 0 },
    config: { mass: 1, tension: 80, friction: 26 },
  })

  const panelWidth = config.size.width
  const panelHeight = config.size.height

  // Color based on detail level - brighter colors for better visibility
  const baseColor = config.semantic.detailLevel === 0
    ? '#4a7ba7' // Brighter blue for summary
    : config.semantic.detailLevel === 1
    ? '#6a8fb7' // Medium blue for level 1
    : '#8aa3c7' // Lighter blue for level 2

  // Add emissive color for self-illumination in VR
  const emissiveColor = isDimmed ? '#001122' : '#1a3a5a'

  return (
    <animated.group
      position={spring.position as unknown as [number, number, number]}
      rotation={spring.rotation as unknown as [number, number, number]}
      scale={spring.scale}
    >
      {/* Panel background with enhanced visibility */}
      <mesh
        ref={meshRef}
        userData={{
          panelId: config.id,
          isDimmed: isDimmed,
          detailLevel: config.semantic.detailLevel,
        }}
        onClick={(e) => {
          e.stopPropagation()
          onFocus()
        }}
      >
        <planeGeometry args={[panelWidth, panelHeight]} />
        <meshStandardMaterial
          color={baseColor}
          emissive={emissiveColor}
          emissiveIntensity={isDimmed ? 0.2 : 0.3}
          opacity={isDimmed ? 0.5 : 1}
          transparent
          side={THREE.DoubleSide}
          roughness={0.7}
          metalness={0.3}
        />
      </mesh>

      {/* Brighter border for visibility */}
      <lineSegments position={[0, 0, 0.01]}>
        <edgesGeometry
          attach="geometry"
          args={[new THREE.PlaneGeometry(panelWidth, panelHeight)]}
        />
        <lineBasicMaterial
          color={isDimmed ? '#6090c0' : '#90c0ff'}
          opacity={1}
          transparent={false}
        />
      </lineSegments>

      {/* Title text - without custom font for reliability */}
      <Text
        position={[0, panelHeight / 2 - 0.3, 0.02]}
        fontSize={0.25}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        maxWidth={panelWidth - 0.4}
        textAlign="center"
        outlineWidth={0.01}
        outlineColor="#000000"
      >
        {config.title}
      </Text>

      {/* Chart type indicator */}
      <Text
        position={[0, 0, 0.02]}
        fontSize={0.18}
        color="#c0e0ff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.008}
        outlineColor="#000000"
      >
        {config.chartType}
      </Text>

      {/* Detail level indicator */}
      <Text
        position={[0, -panelHeight / 2 + 0.25, 0.02]}
        fontSize={0.14}
        color="#a0c0e0"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.006}
        outlineColor="#000000"
      >
        L{config.semantic.detailLevel} · S{config.semantic.processStep}
        {config.semantic.segment !== null && ` · Seg${config.semantic.segment}`}
      </Text>

      {/* Dim overlay */}
      {isDimmed && (
        <mesh position={[0, 0, 0.03]}>
          <planeGeometry args={[panelWidth, panelHeight]} />
          <meshBasicMaterial
            color="#000000"
            opacity={0.4}
            transparent
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </animated.group>
  )
}
