import { useCallback } from 'react'
import { useDashboardStore } from '../../store/dashboardStore.ts'
import { computeLayout } from '../../layouts/index.ts'
import { DashboardPanel } from './DashboardPanel.tsx'
import { CameraController } from './CameraController.tsx'
import { Environment } from './Environment.tsx'
import { PostProcessing } from './PostProcessing.tsx'

export function DashboardScene() {
  const panels = useDashboardStore((s) => s.panels)
  const layout = useDashboardStore((s) => s.layout)
  const focusedPanelId = useDashboardStore((s) => s.focusedPanelId)
  const focusPanel = useDashboardStore((s) => s.focusPanel)
  const unfocus = useDashboardStore((s) => s.unfocus)

  const positions = computeLayout(panels, layout)

  const handleFocus = useCallback(
    (id: string) => {
      if (focusedPanelId === id) {
        unfocus()
      } else {
        focusPanel(id)
      }
    },
    [focusedPanelId, focusPanel, unfocus],
  )

  return (
    <>
      <CameraController />
      <Environment />

      {panels.map((panel, i) => (
        <DashboardPanel
          key={panel.id}
          config={panel}
          target={positions[i]}
          onFocus={() => handleFocus(panel.id)}
        />
      ))}

      <PostProcessing />
    </>
  )
}
