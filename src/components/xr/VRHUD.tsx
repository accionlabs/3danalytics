import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useDashboardStore } from '../../store/dashboardStore.ts'
import { getTextureCache } from '../../xr/TextureCacheContext.ts'

/**
 * VR head-up display — shows breadcrumb navigation + debug info.
 *
 * Uses CanvasTexture on a plane mesh instead of drei <Text>,
 * which breaks XR rendering (scene moves with user's head).
 */
export function VRHUD() {
  const meshRef = useRef<THREE.Mesh>(null)
  const lastText = useRef('')

  const canvas = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 1024
    c.height = 64
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
    const cacheSize = getTextureCache().size
    const text = `${breadcrumb}  |  textures: ${cacheSize}`

    if (text === lastText.current) return
    lastText.current = text

    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#00ff00'
    ctx.font = 'bold 28px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, canvas.width / 2, canvas.height / 2)
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
