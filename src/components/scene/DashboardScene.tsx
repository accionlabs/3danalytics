import { useMemo, useCallback } from 'react'
import { useDashboardStore } from '../../store/dashboardStore.ts'
import { grammarLayout } from '../../layouts/grammarLayout.ts'
import { DashboardPanel } from './DashboardPanel.tsx'
import { CameraController } from './CameraController.tsx'
import { Environment } from './Environment.tsx'
import { PostProcessing } from './PostProcessing.tsx'
import { Connectors } from './Connectors.tsx'
import { causalLinks } from '../../data/mockData.ts'

export function DashboardScene() {
  const panels = useDashboardStore((s) => s.panels)
  const focusedPanelId = useDashboardStore((s) => s.focusedPanelId)
  const focusPanel = useDashboardStore((s) => s.focusPanel)
  const navigateBack = useDashboardStore((s) => s.navigateBack)

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

  const handleItemClick = useCallback(
    (panelId: string, index: number) => {
      const children = childMap.get(panelId)
      const childId = children?.[index]
      if (childId) focusPanel(childId)
    },
    [childMap, focusPanel],
  )

  // When a focused panel is clicked again, drill to its first child
  const handlePanelClick = useCallback(
    (panelId: string) => {
      if (focusedPanelId === panelId) {
        const children = childMap.get(panelId)
        if (children?.length) {
          focusPanel(children[0])
          return
        }
      }
      focusPanel(panelId)
    },
    [focusedPanelId, childMap, focusPanel],
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
            onDrillOut={panel.parentId ? navigateBack : undefined}
          />
        )
      })}

      <Connectors links={causalLinks} positionMap={positionMap} />

      <PostProcessing />
    </>
  )
}
