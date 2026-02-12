import { useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useDashboardStore } from '../../store/dashboardStore.ts'

/**
 * Shared locomotion state — written by useVRNavigation, read by XRTeleport.
 * Module-level singleton so it works across hooks and components.
 */
export const vrLocomotion = {
  /** Accumulated smooth movement offset (world-space) */
  offset: new THREE.Vector3(),
  /** Accumulated snap-turn yaw (radians) */
  yaw: 0,
}

/**
 * VR navigation via "world offset" pattern.
 *
 * Combines two movement systems:
 * 1. Panel teleportation: -cameraTarget.position (from store, on drill/focus)
 * 2. Smooth locomotion: vrLocomotion.offset + yaw (from thumbstick)
 *
 * The final world group position = locomotionOffset + (-cameraTarget.position)
 * with yaw rotation applied around the user's position.
 */
export function XRTeleport({ children }: { children?: ReactNode }) {
  const cameraTarget = useDashboardStore((s) => s.cameraTarget)
  const isTransitioning = useDashboardStore((s) => s.isTransitioning)
  const setTransitioning = useDashboardStore((s) => s.setTransitioning)
  const worldRef = useRef<THREE.Group>(null)

  useFrame(() => {
    if (!worldRef.current) return

    const [px, py, pz] = cameraTarget.position

    // Combine panel teleport offset + smooth locomotion offset
    worldRef.current.position.set(
      -px + vrLocomotion.offset.x,
      -py + vrLocomotion.offset.y,
      -pz + vrLocomotion.offset.z,
    )

    // Apply snap turn rotation
    worldRef.current.rotation.y = vrLocomotion.yaw

    // Clear transitioning flag immediately (snap teleport)
    if (isTransitioning) {
      setTransitioning(false)
    }
  })

  return (
    <group ref={worldRef}>
      {children}
    </group>
  )
}
