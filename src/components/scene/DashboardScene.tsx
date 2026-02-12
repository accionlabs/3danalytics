import { useMemo, useCallback, useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { useXR } from '@react-three/xr'
import * as THREE from 'three'
import { useDashboardStore } from '../../store/dashboardStore.ts'
import { grammarLayout, Z_SPACING } from '../../layouts/grammarLayout.ts'
import { DashboardPanel } from './DashboardPanel.tsx'
import { VRPanel } from './VRPanel.tsx'
import { CameraController, fitIdealDistance } from './CameraController.tsx'
import { Environment } from './Environment.tsx'
import { PostProcessing } from './PostProcessing.tsx'
import { Connectors } from './Connectors.tsx'
import { VRLocomotion } from './VRLocomotion.tsx'
import { VRControllers } from './VRControllers.tsx'
import { causalLinks } from '../../data/mockData.ts'

/** Default distanceFactor (matches DashboardPanel's DEFAULT_DF) */
const DEFAULT_DF = 2
/** Max camera offset before nearer Z-layer occludes — must match CameraController */
const MAX_OFFSET = Z_SPACING - 0.5

export function DashboardScene() {
  const { session } = useXR()
  const isVRMode = !!session
  const panels = useDashboardStore((s) => s.panels)
  const focusedPanelId = useDashboardStore((s) => s.focusedPanelId)
  const focusPanel = useDashboardStore((s) => s.focusPanel)

  // Debug: Log when focusedPanelId changes
  useEffect(() => {
    console.log('[DashboardScene] focusedPanelId changed to:', focusedPanelId)
  }, [focusedPanelId])


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
      console.log('[DashboardScene] blurAndFocus called with targetId:', targetId, 'current focusedPanelId:', focusedPanelId)
      focusPanel(targetId)
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur()
      }
    },
    [focusPanel, focusedPanelId],
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

  return (
    <>
      {/* CameraController only for desktop mode - VRLocomotion handles VR */}
      {!isVRMode && <CameraController />}
      <VRLocomotion />
      {isVRMode && <VRControllers onPanelClick={handlePanelClick} />}
      <Environment />

      {/* VR Debug: Reference markers to visualize space */}
      {isVRMode && (
        <>
          {/* Camera position markers */}
          {/* Starting position Z=6 (overview) - RED */}
          <mesh position={[0, 0.5, 6]}>
            <sphereGeometry args={[0.3, 16, 16]} />
            <meshStandardMaterial color="red" emissive="red" emissiveIntensity={0.5} />
          </mesh>

          {/* Z=1 camera position Z=-6 - GREEN */}
          <mesh position={[0, 0.5, -6]}>
            <sphereGeometry args={[0.3, 16, 16]} />
            <meshStandardMaterial color="green" emissive="green" emissiveIntensity={0.5} />
          </mesh>

          {/* Z=2 camera position Z=-10 - YELLOW */}
          <mesh position={[0, 0.5, -10]}>
            <sphereGeometry args={[0.3, 16, 16]} />
            <meshStandardMaterial color="yellow" emissive="yellow" emissiveIntensity={0.5} />
          </mesh>

          {/* Z=3 camera position Z=-14 - CYAN */}
          <mesh position={[0, 0.5, -14]}>
            <sphereGeometry args={[0.3, 16, 16]} />
            <meshStandardMaterial color="cyan" emissive="cyan" emissiveIntensity={0.5} />
          </mesh>

          {/* Panel layer markers - small cubes at panel Z positions */}
          {/* Z=0 panels at -8 */}
          <mesh position={[-2, 0.5, -8]}>
            <boxGeometry args={[0.2, 0.2, 0.2]} />
            <meshStandardMaterial color="#ff0000" />
          </mesh>
          <mesh position={[2, 0.5, -8]}>
            <boxGeometry args={[0.2, 0.2, 0.2]} />
            <meshStandardMaterial color="#ff0000" />
          </mesh>

          {/* Z=1 panels at -12 */}
          <mesh position={[-2, 0.5, -12]}>
            <boxGeometry args={[0.2, 0.2, 0.2]} />
            <meshStandardMaterial color="#00ff00" />
          </mesh>
          <mesh position={[2, 0.5, -12]}>
            <boxGeometry args={[0.2, 0.2, 0.2]} />
            <meshStandardMaterial color="#00ff00" />
          </mesh>

          {/* Z=2 panels at -16 */}
          <mesh position={[-2, 0.5, -16]}>
            <boxGeometry args={[0.2, 0.2, 0.2]} />
            <meshStandardMaterial color="#ffff00" />
          </mesh>
          <mesh position={[2, 0.5, -16]}>
            <boxGeometry args={[0.2, 0.2, 0.2]} />
            <meshStandardMaterial color="#ffff00" />
          </mesh>
        </>
      )}

      {/* Enhanced lighting and background for VR */}
      {isVRMode && (
        <>
          <ambientLight intensity={0.8} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          <directionalLight position={[-5, 5, 5]} intensity={0.5} />
          <directionalLight position={[0, -5, 5]} intensity={0.5} />

          {/* Space background - large sphere with gradient */}
          <mesh>
            <sphereGeometry args={[100, 32, 32]} />
            <meshBasicMaterial color="#0a0a1a" side={THREE.BackSide} />
          </mesh>

          {/* Grid floor for spatial reference */}
          <gridHelper args={[200, 50, '#1a1a3a', '#0a0a1a']} position={[0, -2, 0]} />
        </>
      )}

      {panels.map((panel) => {
        const pos = positionMap.get(panel.id)
        if (!pos) return null

        // Use VR-compatible panels when in VR mode
        if (isVRMode) {
          return (
            <VRPanel
              key={panel.id}
              config={panel}
              target={pos}
              isDimmed={focusedPanelId !== null && focusedPanelId !== panel.id}
              onFocus={() => handlePanelClick(panel.id)}
            />
          )
        }

        // Use HTML-based panels in desktop/web mode
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

      {/* Disable PostProcessing in VR mode (it often causes rendering issues) */}
      {!isVRMode && <PostProcessing />}
    </>
  )
}
