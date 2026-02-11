import { useMemo, useCallback } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useDashboardStore } from '../../store/dashboardStore.ts'
import { grammarLayout, Z_SPACING } from '../../layouts/grammarLayout.ts'
import { DashboardPanel } from './DashboardPanel.tsx'
import { CameraController, fitIdealDistance } from './CameraController.tsx'
import { Environment } from './Environment.tsx'
import { PostProcessing } from './PostProcessing.tsx'
import { Connectors } from './Connectors.tsx'
import { causalLinks } from '../../data/mockData.ts'

/** Default distanceFactor (matches DashboardPanel's DEFAULT_DF) */
const DEFAULT_DF = 2
/** Max camera offset before nearer Z-layer occludes — must match CameraController */
const MAX_OFFSET = Z_SPACING - 0.5

export function DashboardScene() {
  const panels = useDashboardStore((s) => s.panels)
  const focusedPanelId = useDashboardStore((s) => s.focusedPanelId)
  const focusPanel = useDashboardStore((s) => s.focusPanel)


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
