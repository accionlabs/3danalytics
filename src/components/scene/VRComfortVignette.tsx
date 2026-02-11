import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useDashboardStore } from '../../store/dashboardStore.ts'

/**
 * VR comfort vignette that appears during camera transitions
 * to reduce motion sickness. The vignette darkens the peripheral
 * vision during movement, which helps ground the user.
 */
export function VRComfortVignette() {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.ShaderMaterial | null>(null)
  const isTransitioning = useDashboardStore((s) => s.isTransitioning)
  const targetOpacity = useRef(0)
  const currentOpacity = useRef(0)

  // Create vignette shader material
  useEffect(() => {
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: false,
      uniforms: {
        opacity: { value: 0 },
        innerRadius: { value: 0.3 },
        outerRadius: { value: 0.8 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float opacity;
        uniform float innerRadius;
        uniform float outerRadius;
        varying vec2 vUv;

        void main() {
          vec2 center = vec2(0.5, 0.5);
          float dist = distance(vUv, center);
          float vignette = smoothstep(innerRadius, outerRadius, dist);
          gl_FragColor = vec4(0.0, 0.0, 0.0, vignette * opacity);
        }
      `,
    })
    materialRef.current = material

    return () => {
      material.dispose()
    }
  }, [])

  // Update target opacity based on transition state
  useEffect(() => {
    targetOpacity.current = isTransitioning ? 0.6 : 0
  }, [isTransitioning])

  // Smooth fade in/out
  useFrame(() => {
    if (!materialRef.current) return

    const lerpFactor = 0.1
    currentOpacity.current = THREE.MathUtils.lerp(
      currentOpacity.current,
      targetOpacity.current,
      lerpFactor,
    )

    materialRef.current.uniforms.opacity.value = currentOpacity.current
  })

  return (
    <group>
      {materialRef.current && (
        <mesh ref={meshRef} position={[0, 0, 0]} renderOrder={999}>
          <planeGeometry args={[2, 2]} />
          <primitive object={materialRef.current} attach="material" />
        </mesh>
      )}
    </group>
  )
}
