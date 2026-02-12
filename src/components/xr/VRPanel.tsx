import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { PanelConfig } from '../../types/index.ts'
import { createFallbackTexture } from '../../xr/fallbackTexture.ts'

interface VRPanelProps {
  config: PanelConfig
  position: [number, number, number]
  isDimmed: boolean
  onClick: () => void
}

/**
 * Module-level texture cache for VR panels.
 * Stores both fallback textures and real chart captures.
 * Lives outside React lifecycle to avoid disposal during re-renders.
 */
const vrTextureCache = new Map<string, THREE.CanvasTexture>()

/** Get or create a fallback texture for a panel */
function getOrCreateFallback(id: string, title: string, chartType: string): THREE.CanvasTexture {
  let tex = vrTextureCache.get(id)
  if (!tex) {
    tex = createFallbackTexture(title, chartType)
    vrTextureCache.set(id, tex)
  }
  return tex
}

/** Set a real chart texture (called by OffscreenChartRenderer) */
export function setVRTexture(panelId: string, texture: THREE.CanvasTexture): void {
  vrTextureCache.set(panelId, texture)
}

/**
 * VR-native panel: displays a chart texture on a 3D plane mesh.
 * Uses module-level cached textures that survive React lifecycle.
 * Checks for texture updates imperatively in useFrame (no React re-renders).
 *
 * NOTE: drei <Text> (troika-three-text) breaks XR rendering — it causes
 * the scene to move with the user's head. Use CanvasTexture for text instead.
 */
export function VRPanel({ config, position, isDimmed, onClick }: VRPanelProps) {
  const width = config.size.width
  const height = config.size.height
  const opacity = isDimmed ? 0.3 : 1

  const edgesGeo = useMemo(
    () => new THREE.EdgesGeometry(new THREE.PlaneGeometry(width, height)),
    [width, height],
  )

  // Start with fallback — useFrame will swap in real texture when available
  const initialTexture = getOrCreateFallback(config.id, config.title, config.chartType)
  const matRef = useRef<THREE.MeshBasicMaterial>(null)

  // Imperatively check for texture updates — avoids React re-render disposal
  useFrame(() => {
    if (!matRef.current) return
    const current = vrTextureCache.get(config.id)
    if (current && matRef.current.map !== current) {
      matRef.current.map = current
      matRef.current.needsUpdate = true
    }
  })

  return (
    <group position={position}>
      {/* Panel plane with texture */}
      <mesh onClick={onClick}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial
          ref={matRef}
          map={initialTexture}
          transparent
          opacity={opacity}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Border outline */}
      <lineSegments geometry={edgesGeo}>
        <lineBasicMaterial color="#5080c0" transparent opacity={opacity * 0.8} />
      </lineSegments>
    </group>
  )
}
