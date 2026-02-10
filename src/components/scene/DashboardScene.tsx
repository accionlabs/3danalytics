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

  // Compute positions for ALL panels
  const allPositions = useMemo(() => grammarLayout(panels), [panels])

  // Build position map: panelId → PanelPosition
  const positionMap = useMemo(() => {
    const map = new Map<string, (typeof allPositions)[number]>()
    panels.forEach((p, i) => map.set(p.id, allPositions[i]))
    return map
  }, [panels, allPositions])

  // For the root dashboard: map KPI item index → child panel ID (sorted by processStep)
  const rootChildIds = useMemo(() => {
    const root = panels.find((p) => !p.parentId)
    if (!root) return []
    return panels
      .filter((p) => p.parentId === root.id)
      .sort((a, b) => a.semantic.processStep - b.semantic.processStep)
      .map((p) => p.id)
  }, [panels])

  const handleDashboardItemClick = useCallback(
    (index: number) => {
      const childId = rootChildIds[index]
      if (childId) focusPanel(childId)
    },
    [rootChildIds, focusPanel],
  )

  return (
    <>
      <CameraController />
      <Environment />

      {panels.map((panel) => {
        const pos = positionMap.get(panel.id)
        if (!pos) return null
        const isRoot = !panel.parentId
        return (
          <DashboardPanel
            key={panel.id}
            config={panel}
            target={pos}
            isDimmed={focusedPanelId !== null && focusedPanelId !== panel.id}
            onFocus={() => focusPanel(panel.id)}
            onItemClick={isRoot ? handleDashboardItemClick : undefined}
          />
        )
      })}

      <Connectors links={causalLinks} positionMap={positionMap} />

      <PostProcessing />
    </>
  )
}
