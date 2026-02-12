import { useMemo, useCallback, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useXR, XROrigin } from '@react-three/xr'
import { useDashboardStore } from '../../store/dashboardStore.ts'
import { grammarLayout, Z_SPACING } from '../../layouts/grammarLayout.ts'
import { DashboardPanel } from './DashboardPanel.tsx'
import { VRPanel } from '../xr/VRPanel.tsx'
import { VRNavigation } from '../xr/VRNavigation.tsx'
import { VRHUD } from '../xr/VRHUD.tsx'
import { VRAxisLabels } from '../xr/VRAxisLabels.tsx'
import { VRComfortVignette } from '../xr/VRComfortVignette.tsx'
import { CameraController, fitIdealDistance } from './CameraController.tsx'
import { Environment } from './Environment.tsx'
import { PostProcessing } from './PostProcessing.tsx'
import { Connectors } from './Connectors.tsx'
import { causalLinks } from '../../data/mockData.ts'
import { useXRSession } from '../../xr/useXRSession.ts'

/** Debug display in VR — colored boxes encode XR state as colors */
function VRDebugDisplay() {
  const xrMode = useXR((s) => s.mode)
  const gl = useThree((s) => s.gl)
  const matRef = useRef<THREE.MeshBasicMaterial>(null)
  const posRef = useRef<THREE.MeshBasicMaterial>(null)

  useFrame(({ camera }) => {
    // Left box: green if presenting, red if not
    if (matRef.current) {
      matRef.current.color.set(gl.xr.isPresenting ? '#00ff00' : '#ff0000')
    }
    // Right box: blue if camera is ArrayCamera, yellow if PerspectiveCamera
    if (posRef.current) {
      posRef.current.color.set(camera.type === 'ArrayCamera' ? '#0088ff' : '#ffff00')
    }
  })

  return (
    <group position={[0, 3, 0]}>
      {/* Large banner box so we can see something */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[4, 0.5, 0.1]} />
        <meshBasicMaterial color="#1a1a3a" />
      </mesh>

      {/* Left indicator: green=presenting, red=not presenting */}
      <mesh position={[-1.2, 0, 0.06]}>
        <boxGeometry args={[0.6, 0.3, 0.05]} />
        <meshBasicMaterial ref={matRef} color="#ff0000" />
      </mesh>

      {/* Right indicator: blue=ArrayCamera(XR), yellow=PerspectiveCamera(desktop) */}
      <mesh position={[1.2, 0, 0.06]}>
        <boxGeometry args={[0.6, 0.3, 0.05]} />
        <meshBasicMaterial ref={posRef} color="#ffff00" />
      </mesh>

      {/* Mode indicator: cyan=immersive-vr, magenta=other */}
      <mesh position={[0, 0, 0.06]}>
        <boxGeometry args={[0.6, 0.3, 0.05]} />
        <meshBasicMaterial color={xrMode === 'immersive-vr' ? '#00ffff' : '#ff00ff'} />
      </mesh>
    </group>
  )
}

/** Default distanceFactor (matches DashboardPanel's DEFAULT_DF) */
const DEFAULT_DF = 2
/** Max camera offset before nearer Z-layer occludes — must match CameraController */
const MAX_OFFSET = Z_SPACING - 0.5

export function DashboardScene() {
  const { isInXR } = useXRSession()
  const panels = useDashboardStore((s) => s.panels)
  const focusedPanelId = useDashboardStore((s) => s.focusedPanelId)
  const focusPanel = useDashboardStore((s) => s.focusPanel)
  const gl = useThree((s) => s.gl)

  void gl // suppress unused warning — gl is accessed via useThree() below

  // Compute distanceFactor: when the camera distance is capped by Z_SPACING,
  // reduce df so the panel still fills 85% of the usable viewport.
  // fill = (panel.size * df/DEFAULT_DF) / (2 * d * tan(fov/2) * aspect * frac)
  // Keeping fill constant: df_new/d_new = df_old/d_old → df_new = DEFAULT_DF * d_capped/d_ideal
  const { size, camera: threeCamera } = useThree()
  const focusedPanel = focusedPanelId ? panels.find((p) => p.id === focusedPanelId) : undefined
  const panelDf = (() => {
    if (!focusedPanel) return DEFAULT_DF
    const fov = (threeCamera as THREE.PerspectiveCamera).fov
    const idealDist = fitIdealDistance(
      focusedPanel.size.width, focusedPanel.size.height,
      size.width, size.height, fov,
    )
    // Z=0 has nothing in front — no cap needed
    if (focusedPanel.semantic.detailLevel === 0) return DEFAULT_DF
    if (idealDist <= MAX_OFFSET) return DEFAULT_DF
    // Camera is capped: shrink df proportionally to preserve 85% fill
    return DEFAULT_DF * MAX_OFFSET / idealDist
  })()

  // Compute positions for ALL panels
  const allPositions = useMemo(() => grammarLayout(panels), [panels])

  // Build position map: panelId → PanelPosition
  const positionMap = useMemo(() => {
    const map = new Map<string, (typeof allPositions)[number]>()
    panels.forEach((p, i) => map.set(p.id, allPositions[i]))
    return map
  }, [panels, allPositions])

  // Build map: parentId → sorted child panel IDs
  const childMap = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const p of panels) {
      if (!p.parentId) continue
      const siblings = map.get(p.parentId) ?? []
      siblings.push(p.id)
      map.set(p.parentId, siblings)
    }
    // Sort children by processStep (X) for Z=0→Z=1, by segment (Y) for Z=1→Z=2
    for (const [parentId, children] of map) {
      const parent = panels.find((p) => p.id === parentId)
      children.sort((a, b) => {
        const pa = panels.find((p) => p.id === a)!
        const pb = panels.find((p) => p.id === b)!
        if (parent?.semantic.detailLevel === 0) return pa.semantic.processStep - pb.semantic.processStep
        return (pa.semantic.segment ?? 0) - (pb.semantic.segment ?? 0)
      })
    }
    return map
  }, [panels])

  // After any drill/focus, blur the active HTML element so keyboard and
  // pointer events return to the canvas instead of staying trapped in
  // the drei <Html> overlay that was clicked.
  const blurAndFocus = useCallback(
    (targetId: string) => {
      focusPanel(targetId)
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur()
      }
    },
    [focusPanel],
  )

  const handleItemClick = useCallback(
    (panelId: string, index: number) => {
      const children = childMap.get(panelId)
      const childId = children?.[index]
      if (childId) blurAndFocus(childId)
    },
    [childMap, blurAndFocus],
  )

  // When a focused panel is clicked again, drill to its first child
  const handlePanelClick = useCallback(
    (panelId: string) => {
      if (focusedPanelId === panelId) {
        const children = childMap.get(panelId)
        if (children?.length) {
          blurAndFocus(children[0])
          return
        }
      }
      blurAndFocus(panelId)
    },
    [focusedPanelId, childMap, blurAndFocus],
  )

  // VR mode: world content inside VRNavigation's offset group.
  // NOTE: drei <Text> (troika-three-text) breaks XR rendering — all text
  // uses CanvasTexture on plane meshes instead.
  if (isInXR) {
    return (
      <>
        <XROrigin position={[0, 0, 0]} />
        <VRNavigation>
          <VRDebugDisplay />
          <Environment />
          <VRAxisLabels />
          {panels.map((panel) => {
            const pos = positionMap.get(panel.id)
            if (!pos) return null
            return (
              <VRPanel
                key={panel.id}
                config={panel}
                position={pos.position}
                isDimmed={focusedPanelId !== null && focusedPanelId !== panel.id}
                onClick={() => handlePanelClick(panel.id)}
              />
            )
          })}
          <Connectors links={causalLinks} positionMap={positionMap} />
        </VRNavigation>
        <VRHUD />
        <VRComfortVignette />
        <PostProcessing />
      </>
    )
  }

  // Desktop mode: unchanged
  return (
    <>
      <CameraController />
      <Environment />

      {panels.map((panel) => {
        const pos = positionMap.get(panel.id)
        if (!pos) return null
        return (
          <DashboardPanel
            key={panel.id}
            config={panel}
            target={pos}
            isDimmed={focusedPanelId !== null && focusedPanelId !== panel.id}
            onFocus={() => handlePanelClick(panel.id)}
            onItemClick={childMap.has(panel.id) ? (i) => handleItemClick(panel.id, i) : undefined}
            onDrillTo={blurAndFocus}
            distanceFactor={panelDf}
          />
        )
      })}

      <Connectors links={causalLinks} positionMap={positionMap} />

      <PostProcessing />
    </>
  )
}
