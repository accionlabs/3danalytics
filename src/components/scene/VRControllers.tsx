import { useRef, useState } from 'react'
import { useXR, useXREvent, useXRInputSourceState } from '@react-three/xr'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useDashboardStore } from '../../store/dashboardStore.ts'

interface VRControllersProps {
  onPanelClick?: (panelId: string) => void
}

/**
 * VR Controller raycasting and interaction system.
 * Features:
 * - Trigger: Drill into panel (move deeper in Z-axis)
 * - Grip: Drill out / navigate back (return to parent)
 * - Thumbstick: Navigate X/Y axes (pipeline stages and segments)
 * - Visual feedback: Different glow levels for different panel states
 * - Haptic feedback: Controller vibration on hover and select
 */
export function VRControllers({ onPanelClick }: VRControllersProps) {
  const { session } = useXR()
  const { gl } = useThree()
  const navigateBack = useDashboardStore((s) => s.navigateBack)
  const panels = useDashboardStore((s) => s.panels)

  const rightController = useXRInputSourceState('controller', 'right')
  const leftController = useXRInputSourceState('controller', 'left')

  // Raycasting state
  const raycaster = useRef(new THREE.Raycaster())
  const [hoveredObject, setHoveredObject] = useState<THREE.Object3D | null>(null)
  const lastHapticTime = useRef(0)

  // Haptic feedback helper
  const triggerHaptic = (intensity: number, duration: number) => {
    const now = Date.now()
    if (now - lastHapticTime.current < 50) return // Throttle haptics
    lastHapticTime.current = now

    const controller = rightController || leftController
    const gamepad = controller?.gamepad as any
    if (!gamepad?.hapticActuators?.length) return

    try {
      gamepad.hapticActuators[0].pulse(intensity, duration)
    } catch (e) {
      // Haptics not supported, silently ignore
    }
  }

  // Handle controller SELECT (trigger button) - Drill into panel
  useXREvent('select', (_event) => {
    console.log('[VRControllers] Select event triggered, hoveredObject:', hoveredObject?.userData.panelId)
    if (hoveredObject && onPanelClick) {
      const panelId = hoveredObject.userData.panelId
      if (panelId) {
        console.log('[VRControllers] Calling onPanelClick with panelId:', panelId)
        onPanelClick(panelId)
        triggerHaptic(0.8, 100) // Strong haptic on selection
      }
    }
  })

  // Handle controller SQUEEZE (grip button) - Drill out / Navigate back
  useXREvent('squeeze', (_event) => {
    navigateBack()
    triggerHaptic(0.6, 80) // Medium haptic on back navigation
  })

  // Raycast from XR controllers
  useFrame(({ scene }) => {
    if (!session) return

    // Get XR input sources (controllers)
    const inputSources = session.inputSources
    if (!inputSources || inputSources.length === 0) return

    // Use the first controller with a targetRaySpace
    let controllerSpace: XRSpace | null = null
    for (const source of inputSources) {
      if (source.targetRaySpace) {
        controllerSpace = source.targetRaySpace
        break
      }
    }

    if (!controllerSpace) return

    // Get the reference space
    const refSpace = gl.xr.getReferenceSpace()
    if (!refSpace) return

    // Get controller pose
    const frame = gl.xr.getFrame()
    if (!frame) return

    const pose = frame.getPose(controllerSpace, refSpace)
    if (!pose) return

    // Set raycaster from controller pose
    const { transform } = pose
    const origin = new THREE.Vector3(
      transform.position.x,
      transform.position.y,
      transform.position.z
    )

    const orientation = new THREE.Quaternion(
      transform.orientation.x,
      transform.orientation.y,
      transform.orientation.z,
      transform.orientation.w
    )

    const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(orientation)

    raycaster.current.set(origin, direction)

    // Find all panel meshes
    const intersectables: THREE.Object3D[] = []
    scene.traverse((obj) => {
      if (obj.userData.panelId && (obj as THREE.Mesh).isMesh) {
        intersectables.push(obj)
      }
    })

    const intersects = raycaster.current.intersectObjects(intersectables, false)

    if (intersects.length > 0) {
      const newHovered = intersects[0].object
      if (newHovered !== hoveredObject) {
        // Reset previous hover
        if (hoveredObject) {
          const mat = (hoveredObject as THREE.Mesh).material as THREE.MeshStandardMaterial
          if (mat.emissiveIntensity !== undefined) {
            const isDimmed = hoveredObject.userData.isDimmed
            mat.emissiveIntensity = isDimmed ? 0.2 : 0.3
          }
        }

        // Set new hover with enhanced glow
        const mat = (newHovered as THREE.Mesh).material as THREE.MeshStandardMaterial
        if (mat.emissiveIntensity !== undefined) {
          // Check if this panel has children (drillable)
          const panelId = newHovered.userData.panelId
          const panel = panels.find(p => p.id === panelId)
          const hasChildren = panel?.parentId !== undefined || panels.some(p => p.parentId === panelId)

          // Brighter glow for drillable panels
          mat.emissiveIntensity = hasChildren ? 1.0 : 0.8
        }

        setHoveredObject(newHovered)

        // Light haptic feedback on hover
        triggerHaptic(0.3, 30)
      }
    } else if (hoveredObject) {
      // Clear hover
      const mat = (hoveredObject as THREE.Mesh).material as THREE.MeshStandardMaterial
      if (mat.emissiveIntensity !== undefined) {
        const isDimmed = hoveredObject.userData.isDimmed
        mat.emissiveIntensity = isDimmed ? 0.2 : 0.3
      }
      setHoveredObject(null)
    }
  })

  // Visual ray from controller (optional - for debugging/feedback)
  if (!session) return null

  return (
    <>
      {/* Visual pointer ray */}
      {hoveredObject && (
        <group>
          {/* Ray line from controller to hovered panel */}
          <mesh position={raycaster.current.ray.origin.clone().lerp(
            hoveredObject.position, 0.5
          )}>
            <cylinderGeometry args={[0.002, 0.002, raycaster.current.ray.origin.distanceTo(hoveredObject.position), 8]} />
            <meshBasicMaterial
              color={hoveredObject.userData.hasChildren ? '#00ff00' : '#ffffff'}
              transparent
              opacity={0.6}
            />
          </mesh>

          {/* Dot at intersection point */}
          <mesh position={hoveredObject.position}>
            <sphereGeometry args={[0.05, 16, 16]} />
            <meshBasicMaterial
              color="#00ffff"
              transparent
              opacity={0.8}
            />
          </mesh>
        </group>
      )}
    </>
  )
}
