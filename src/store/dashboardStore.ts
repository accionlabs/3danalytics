import { create } from 'zustand'
import type { DashboardState, PanelConfig, LayoutType, CameraTarget } from '../types/index.ts'
import { computeLayout } from '../layouts/index.ts'

/** Default overview camera position per layout */
const OVERVIEW_CAMERAS: Record<LayoutType, CameraTarget> = {
  arc: { position: [0, 0, 0], lookAt: [0, 0, -8] },
  grid: { position: [0, 0, 0], lookAt: [0, 0, -10] },
  room: { position: [0, 1, 0], lookAt: [0, 1, -5] },
}

/** Compute a camera position in front of a focused panel */
function cameraForPanel(
  panels: PanelConfig[],
  layout: LayoutType,
  panelId: string,
): CameraTarget {
  const positions = computeLayout(panels, layout)
  const idx = panels.findIndex((p) => p.id === panelId)
  if (idx === -1) return OVERVIEW_CAMERAS[layout]

  const panelPos = positions[idx]
  const [px, py, pz] = panelPos.position
  const [, ry] = panelPos.rotation

  // Offset camera 3 units along the panel's facing normal
  const offsetX = px + Math.sin(ry) * 3
  const offsetZ = pz + Math.cos(ry) * 3

  return {
    position: [offsetX, py, offsetZ],
    lookAt: [px, py, pz],
  }
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  panels: [],
  layout: 'arc',
  focusedPanelId: null,
  drillDownStack: [],
  cameraTarget: OVERVIEW_CAMERAS.arc,
  isTransitioning: false,
  isDragging: false,

  setPanels: (panels: PanelConfig[]) => set({ panels }),

  setLayout: (layout: LayoutType) =>
    set((state) => ({
      layout,
      cameraTarget: state.focusedPanelId
        ? cameraForPanel(state.panels, layout, state.focusedPanelId)
        : OVERVIEW_CAMERAS[layout],
    })),

  focusPanel: (id: string) => {
    const { panels, layout } = get()
    const target = cameraForPanel(panels, layout, id)
    set({
      focusedPanelId: id,
      cameraTarget: target,
      isTransitioning: true,
      drillDownStack: [id],
    })
  },

  unfocus: () => {
    const { layout } = get()
    set({
      focusedPanelId: null,
      cameraTarget: OVERVIEW_CAMERAS[layout],
      isTransitioning: true,
      drillDownStack: [],
    })
  },

  drillDown: (panelId: string) => {
    const { panels, layout, drillDownStack } = get()
    const target = cameraForPanel(panels, layout, panelId)
    set({
      focusedPanelId: panelId,
      cameraTarget: target,
      isTransitioning: true,
      drillDownStack: [...drillDownStack, panelId],
    })
  },

  drillUp: () => {
    const { drillDownStack, panels, layout } = get()
    if (drillDownStack.length <= 1) {
      // Return to overview
      set({
        focusedPanelId: null,
        cameraTarget: OVERVIEW_CAMERAS[layout],
        isTransitioning: true,
        drillDownStack: [],
      })
    } else {
      const newStack = drillDownStack.slice(0, -1)
      const parentId = newStack[newStack.length - 1]
      const target = cameraForPanel(panels, layout, parentId)
      set({
        focusedPanelId: parentId,
        cameraTarget: target,
        isTransitioning: true,
        drillDownStack: newStack,
      })
    }
  },

  setTransitioning: (isTransitioning: boolean) => set({ isTransitioning }),
  setDragging: (isDragging: boolean) => set({ isDragging }),
}))
