import { create } from 'zustand'
import type { DashboardState, PanelConfig, CameraTarget, NavigationHistory } from '../types/index.ts'
import { grammarLayout } from '../layouts/grammarLayout.ts'

/** Default overview camera — centered on the grammar layout */
const OVERVIEW_CAMERA: CameraTarget = {
  position: [0, 0, 6],
  lookAt: [0, 0, -8],
}

const EMPTY_NAV: NavigationHistory = { steps: [], currentIndex: -1 }

/** Compute a camera position 3 units in front of a panel along +Z */
function cameraForPanel(
  panels: PanelConfig[],
  panelId: string,
): CameraTarget {
  const positions = grammarLayout(panels)
  const idx = panels.findIndex((p) => p.id === panelId)
  if (idx === -1) return OVERVIEW_CAMERA

  const [px, py, pz] = positions[idx].position
  return {
    position: [px, py, pz + 3],
    lookAt: [px, py, pz],
  }
}

/** Compute overview camera dynamically from all panel positions */
export function overviewCameraFromPanels(panels: PanelConfig[]): CameraTarget {
  if (panels.length === 0) return OVERVIEW_CAMERA

  const positions = grammarLayout(panels)
  let minX = Infinity, maxX = -Infinity
  let minY = Infinity, maxY = -Infinity
  let minZ = Infinity, maxZ = -Infinity

  for (const pos of positions) {
    const [x, y, z] = pos.position
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)
    minZ = Math.min(minZ, z)
    maxZ = Math.max(maxZ, z)
  }

  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2
  const centerZ = (minZ + maxZ) / 2
  const spanX = maxX - minX + 4
  const spanY = maxY - minY + 4
  const depthSpan = maxZ - minZ
  const dist = Math.max(spanX, spanY) / (2 * Math.tan(Math.PI / 6)) + depthSpan / 2 + 2

  return {
    position: [centerX, centerY, maxZ + dist],
    lookAt: [centerX, centerY, centerZ],
  }
}

/** Detect which axis a navigation move is along */
function detectAxis(
  panels: PanelConfig[],
  fromId: string | null,
  toId: string,
): 'x' | 'y' | 'z' {
  if (!fromId) return 'x'
  const from = panels.find((p) => p.id === fromId)
  const to = panels.find((p) => p.id === toId)
  if (!from || !to) return 'x'

  const dx = Math.abs(from.semantic.processStep - to.semantic.processStep)
  const dy = Math.abs((from.semantic.segment ?? 0) - (to.semantic.segment ?? 0))
  const dz = Math.abs(from.semantic.detailLevel - to.semantic.detailLevel)

  if (dz > 0) return 'z'
  if (dy > dx) return 'y'
  return 'x'
}

/** All panel IDs — every panel is always visible */
function allPanelIds(panels: PanelConfig[]): string[] {
  return panels.map((p) => p.id)
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  panels: [],
  focusedPanelId: null,
  navigation: EMPTY_NAV,
  visiblePanelIds: [],
  cameraTarget: OVERVIEW_CAMERA,
  isTransitioning: false,
  isDragging: false,
  isVRMode: false,
  vrComfortSettings: {
    useSnapTransitions: false,
    useVignette: true,
    reducedSpeed: false,
  },

  setPanels: (panels: PanelConfig[]) => {
    const root = panels.find((p) => !p.parentId)
    const target = root ? cameraForPanel(panels, root.id) : overviewCameraFromPanels(panels)
    set({
      panels,
      visiblePanelIds: allPanelIds(panels),
      focusedPanelId: root?.id ?? null,
      cameraTarget: target,
      navigation: root
        ? { steps: [{ panelId: root.id, axis: 'z', label: root.title, cameraTarget: target }], currentIndex: 0 }
        : EMPTY_NAV,
    })
  },

  focusPanel: (id: string) => {
    const { panels, focusedPanelId } = get()
    if (focusedPanelId === id) return // Already focused — no-op
    const axis = detectAxis(panels, focusedPanelId, id)
    get().navigateTo(id, axis)
  },

  unfocus: () => {
    get().navigateHome()
  },

  navigateTo: (panelId: string, axis: 'x' | 'y' | 'z') => {
    const { panels, navigation } = get()
    const target = cameraForPanel(panels, panelId)
    const panel = panels.find((p) => p.id === panelId)

    // Current path up to this point
    const currentPath = navigation.steps.slice(0, navigation.currentIndex + 1)

    // If this panel is already in the current path, truncate back to it
    const existingIdx = currentPath.findIndex((s) => s.panelId === panelId)
    if (existingIdx >= 0) {
      const truncated = currentPath.slice(0, existingIdx + 1)
      set({
        focusedPanelId: panelId,
        cameraTarget: target,
        isTransitioning: true,
        navigation: { steps: truncated, currentIndex: existingIdx },
        visiblePanelIds: allPanelIds(panels),
      })
      return
    }

    // New panel: append to the path
    currentPath.push({
      panelId,
      axis,
      label: panel?.title ?? panelId,
      cameraTarget: target,
    })

    set({
      focusedPanelId: panelId,
      cameraTarget: target,
      isTransitioning: true,
      navigation: { steps: currentPath, currentIndex: currentPath.length - 1 },
      visiblePanelIds: allPanelIds(panels),
    })
  },

  navigateBack: () => {
    const { panels, focusedPanelId } = get()
    if (!focusedPanelId) return
    const current = panels.find((p) => p.id === focusedPanelId)
    if (!current?.parentId) return // Already at root — no-op
    // Go to parent panel
    get().focusPanel(current.parentId)
  },

  navigateForward: () => {
    const { navigation, panels } = get()
    if (navigation.currentIndex >= navigation.steps.length - 1) return
    const newIndex = navigation.currentIndex + 1
    const step = navigation.steps[newIndex]
    set({
      focusedPanelId: step.panelId,
      cameraTarget: step.cameraTarget,
      isTransitioning: true,
      navigation: { ...navigation, currentIndex: newIndex },
      visiblePanelIds: allPanelIds(panels),
    })
  },

  navigateHome: () => {
    const { panels } = get()
    const root = panels.find((p) => !p.parentId)
    if (!root) return
    const target = cameraForPanel(panels, root.id)
    set({
      focusedPanelId: root.id,
      cameraTarget: target,
      isTransitioning: true,
      navigation: {
        steps: [{ panelId: root.id, axis: 'z', label: root.title, cameraTarget: target }],
        currentIndex: 0,
      },
      visiblePanelIds: allPanelIds(panels),
    })
  },

  navigateToStep: (index: number) => {
    const { navigation, panels } = get()
    if (index < 0 || index >= navigation.steps.length) return
    const step = navigation.steps[index]
    // Truncate: discard steps beyond the target so breadcrumb shows only the current path
    const truncatedSteps = navigation.steps.slice(0, index + 1)
    set({
      focusedPanelId: step.panelId,
      cameraTarget: step.cameraTarget,
      isTransitioning: true,
      navigation: { steps: truncatedSteps, currentIndex: index },
      visiblePanelIds: allPanelIds(panels),
    })
  },

  setTransitioning: (isTransitioning: boolean) => set({ isTransitioning }),
  setDragging: (isDragging: boolean) => set({ isDragging }),
  setVRMode: (isVRMode: boolean) => set({ isVRMode }),
  setVRComfortSettings: (settings) => set((state) => ({
    vrComfortSettings: { ...state.vrComfortSettings, ...settings },
  })),
}))
