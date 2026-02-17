import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useDashboardStore } from '../../store/dashboardStore.ts'

/**
 * VR head-up display — shows breadcrumb navigation.
 *
 * Uses CanvasTexture on a plane mesh instead of drei <Text>,
 * which breaks XR rendering (scene moves with user's head).
 *
 * Canvas is 512×32 (was 1024×64) — 4× less VRAM.
 * Texture-cache size string removed — it caused a canvas redraw on every
 * texture upload during VR startup, which is the worst time for CPU spikes.
 */
export function VRHUD() {
  const meshRef = useRef<THREE.Mesh>(null)
  const lastText = useRef('')

  const canvas = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 512
    c.height = 32
    return c
  }, [])

  const texture = useMemo(() => {
    const tex = new THREE.CanvasTexture(canvas)
    tex.needsUpdate = true
    return tex
  }, [canvas])

  useFrame(() => {
    const { navigation } = useDashboardStore.getState()
    const breadcrumb = navigation.steps
      .slice(0, navigation.currentIndex + 1)
      .map((s) => s.label)
      .join(' > ') || 'Overview'

    if (breadcrumb === lastText.current) return
    lastText.current = breadcrumb

    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#00ff00'
    ctx.font = 'bold 14px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(breadcrumb, canvas.width / 2, canvas.height / 2)
    texture.needsUpdate = true
  })

  return (
    <mesh ref={meshRef} position={[0, 1.5, -2]}>
      <planeGeometry args={[2, 0.12]} />
      <meshBasicMaterial
        map={texture}
        transparent
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  )
}
