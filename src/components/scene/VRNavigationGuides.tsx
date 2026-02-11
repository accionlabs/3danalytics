import { Text } from '@react-three/drei'
import { useDashboardStore } from '../../store/dashboardStore.ts'
import { useMemo } from 'react'

/**
 * VR Navigation Guides - shows axis labels, available directions, and navigation hints.
 * Helps users understand the spatial coordinate system and where they can navigate.
 */
export function VRNavigationGuides() {
  const panels = useDashboardStore((s) => s.panels)
  const focusedPanelId = useDashboardStore((s) => s.focusedPanelId)

  const currentPanel = panels.find((p) => p.id === focusedPanelId)

  // Find available navigation directions from current panel
  const availableDirections = useMemo(() => {
    if (!currentPanel) return { left: false, right: false, up: false, down: false, in: false, out: false }

    const { processStep, segment, detailLevel } = currentPanel.semantic

    return {
      left: panels.some((p) => p.semantic.processStep === processStep - 1 && p.semantic.segment === segment && p.semantic.detailLevel === detailLevel),
      right: panels.some((p) => p.semantic.processStep === processStep + 1 && p.semantic.segment === segment && p.semantic.detailLevel === detailLevel),
      up: panels.some((p) => p.semantic.processStep === processStep && p.semantic.segment === (segment ?? 0) + 1 && p.semantic.detailLevel === detailLevel),
      down: panels.some((p) => p.semantic.processStep === processStep && p.semantic.segment === (segment ?? 0) - 1 && p.semantic.detailLevel === detailLevel),
      in: panels.some((p) => p.parentId === currentPanel.id), // Has children
      out: !!currentPanel.parentId, // Has parent
    }
  }, [currentPanel, panels])

  const directionLabels = useMemo(() => {
    if (!currentPanel) return {}

    return {
      left: panels.find((p) => p.semantic.processStep === currentPanel.semantic.processStep - 1 && p.semantic.detailLevel === 0)?.title || 'Previous',
      right: panels.find((p) => p.semantic.processStep === currentPanel.semantic.processStep + 1 && p.semantic.detailLevel === 0)?.title || 'Next',
    }
  }, [currentPanel, panels])

  if (!currentPanel) return null

  return (
    <group>
      {/* X-Axis Indicators (Process Steps) */}
      {availableDirections.left && (
        <group position={[-5, 0, 0]}>
          {/* Left Arrow */}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <coneGeometry args={[0.3, 0.6, 8]} />
            <meshBasicMaterial color="#4a90e2" transparent opacity={0.7} />
          </mesh>
          <Text
            position={[0, -0.5, 0]}
            fontSize={0.15}
            color="#4a90e2"
            anchorX="center"
            anchorY="middle"
          >
            ← {directionLabels.left}
          </Text>
        </group>
      )}

      {availableDirections.right && (
        <group position={[5, 0, 0]}>
          {/* Right Arrow */}
          <mesh rotation={[0, 0, -Math.PI / 2]}>
            <coneGeometry args={[0.3, 0.6, 8]} />
            <meshBasicMaterial color="#4a90e2" transparent opacity={0.7} />
          </mesh>
          <Text
            position={[0, -0.5, 0]}
            fontSize={0.15}
            color="#4a90e2"
            anchorX="center"
            anchorY="middle"
          >
            {directionLabels.right} →
          </Text>
        </group>
      )}

      {/* Y-Axis Indicators (Segments) */}
      {availableDirections.up && (
        <group position={[0, 3, 0]}>
          {/* Up Arrow */}
          <mesh rotation={[0, 0, 0]}>
            <coneGeometry args={[0.3, 0.6, 8]} />
            <meshBasicMaterial color="#2ecc71" transparent opacity={0.7} />
          </mesh>
          <Text
            position={[0, 0.5, 0]}
            fontSize={0.15}
            color="#2ecc71"
            anchorX="center"
            anchorY="middle"
          >
            ↑ Segment
          </Text>
        </group>
      )}

      {availableDirections.down && (
        <group position={[0, -3, 0]}>
          {/* Down Arrow */}
          <mesh rotation={[0, 0, Math.PI]}>
            <coneGeometry args={[0.3, 0.6, 8]} />
            <meshBasicMaterial color="#2ecc71" transparent opacity={0.7} />
          </mesh>
          <Text
            position={[0, -0.5, 0]}
            fontSize={0.15}
            color="#2ecc71"
            anchorX="center"
            anchorY="middle"
          >
            ↓ Segment
          </Text>
        </group>
      )}

      {/* Z-Axis Indicators (Drill In/Out) */}
      {availableDirections.in && (
        <group position={[0, -2, -2]}>
          <mesh>
            <sphereGeometry args={[0.2, 16, 16]} />
            <meshBasicMaterial color="#e74c3c" transparent opacity={0.8} />
          </mesh>
          <Text
            position={[0, -0.4, 0]}
            fontSize={0.12}
            color="#e74c3c"
            anchorX="center"
            anchorY="middle"
          >
            Drill In →
          </Text>
        </group>
      )}

      {availableDirections.out && (
        <group position={[0, -2, 2]}>
          <mesh>
            <sphereGeometry args={[0.2, 16, 16]} />
            <meshBasicMaterial color="#f39c12" transparent opacity={0.8} />
          </mesh>
          <Text
            position={[0, -0.4, 0]}
            fontSize={0.12}
            color="#f39c12"
            anchorX="center"
            anchorY="middle"
          >
            ← Back
          </Text>
        </group>
      )}

      {/* Navigation Instructions */}
      <group position={[0, -3.5, -3]}>
        <mesh position={[0, 0, 0]}>
          <planeGeometry args={[4, 1]} />
          <meshBasicMaterial color="#1a1a2e" transparent opacity={0.8} />
        </mesh>
        <Text
          position={[0, 0.25, 0.01]}
          fontSize={0.12}
          color="white"
          anchorX="center"
          anchorY="middle"
          maxWidth={3.8}
        >
          Look at panel + Trigger to select
        </Text>
        <Text
          position={[0, 0, 0.01]}
          fontSize={0.1}
          color="#94a3b8"
          anchorX="center"
          anchorY="middle"
          maxWidth={3.8}
        >
          Left stick: X/Y | Right stick: Drill | Grip: Back
        </Text>
        <Text
          position={[0, -0.25, 0.01]}
          fontSize={0.09}
          color="#64748b"
          anchorX="center"
          anchorY="middle"
          maxWidth={3.8}
        >
          Level {currentPanel.semantic.detailLevel} - {currentPanel.title}
        </Text>
      </group>

      {/* Axis Labels (Fixed in view) */}
      <group position={[6, -3, -3]}>
        <Text
          fontSize={0.1}
          color="#4a90e2"
          anchorX="left"
          anchorY="middle"
        >
          X: Pipeline Stages →
        </Text>
      </group>

      <group position={[-6, 3, -3]}>
        <Text
          fontSize={0.1}
          color="#2ecc71"
          anchorX="left"
          anchorY="middle"
        >
          Y: Customer Segments ↕
        </Text>
      </group>

      <group position={[-6, -3, -3]}>
        <Text
          fontSize={0.1}
          color="#e74c3c"
          anchorX="left"
          anchorY="middle"
        >
          Z: Detail Depth ⟷
        </Text>
      </group>
    </group>
  )
}
