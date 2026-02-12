import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useDashboardStore } from '../../store/dashboardStore.ts'

/**
 * Camera-attached comfort vignette for VR teleportation.
 * Fades to black when transitioning between panels, then fades back.
 * Helps prevent motion sickness during snap teleportation.
 */
export function VRComfortVignette() {
  const isTransitioning = useDashboardStore((s) => s.isTransitioning)
  const meshRef = useRef<THREE.Mesh>(null)
  const opacity = useRef(0)

  useFrame(({ camera }) => {
    if (!meshRef.current) return

    // Fade in when transitioning, fade out when done
    const targetOpacity = isTransitioning ? 0.8 : 0
    opacity.current += (targetOpacity - opacity.current) * 0.15

    const material = meshRef.current.material as THREE.MeshBasicMaterial
    material.opacity = opacity.current
    material.visible = opacity.current > 0.01

    // Keep quad attached to camera
    meshRef.current.position.copy(camera.position)
    meshRef.current.quaternion.copy(camera.quaternion)
    meshRef.current.translateZ(-0.1) // Just in front of camera
  })

  return (
    <mesh ref={meshRef} renderOrder={9999}>
      <planeGeometry args={[2, 2]} />
      <meshBasicMaterial
        color="#000000"
        transparent
        opacity={0}
        depthTest={false}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}
