import { describe, it, expect, beforeEach } from 'vitest'
import { useDashboardStore } from '../store/dashboardStore.ts'
import type { PanelConfig } from '../types/index.ts'

const mockPanels: PanelConfig[] = [
  {
    id: 'root', title: 'Dashboard', chartType: 'test',
    size: { width: 3, height: 2 }, data: {},
    semantic: { processStep: 1, segment: null, detailLevel: 0 },
  },
  {
    id: 'p1', title: 'Panel 1', chartType: 'test',
    size: { width: 3, height: 2 }, data: {},
    semantic: { processStep: 0, segment: null, detailLevel: 1 },
    parentId: 'root',
  },
  {
    id: 'p2', title: 'Panel 2', chartType: 'test',
    size: { width: 3, height: 2 }, data: {},
    semantic: { processStep: 1, segment: null, detailLevel: 1 },
    parentId: 'root',
  },
  {
    id: 'p3', title: 'Panel 3', chartType: 'test',
    size: { width: 3, height: 2 }, data: {},
    semantic: { processStep: 2, segment: null, detailLevel: 1 },
    parentId: 'root',
  },
  {
    id: 'p2-seg0', title: 'Panel 2 Seg 0', chartType: 'test',
    size: { width: 3, height: 2 }, data: {},
    semantic: { processStep: 1, segment: 0, detailLevel: 2 },
    parentId: 'p2',
  },
  {
    id: 'p2-seg1', title: 'Panel 2 Seg 1', chartType: 'test',
    size: { width: 3, height: 2 }, data: {},
    semantic: { processStep: 1, segment: 1, detailLevel: 2 },
    parentId: 'p2',
  },
  {
    id: 'p3-seg0', title: 'Panel 3 Seg 0', chartType: 'test',
    size: { width: 3, height: 2 }, data: {},
    semantic: { processStep: 2, segment: 0, detailLevel: 2 },
    parentId: 'p3',
  },
]

describe('dashboardStore', () => {
  beforeEach(() => {
    useDashboardStore.setState({
      panels: [],
      focusedPanelId: null,
      navigation: { steps: [], currentIndex: -1 },
      visiblePanelIds: [],
      cameraTarget: { position: [0, 0, 6], lookAt: [0, 0, -8] },
      isTransitioning: false,
      isDragging: false,
    })
  })

  it('starts with default state', () => {
    const state = useDashboardStore.getState()
    expect(state.panels).toEqual([])
    expect(state.focusedPanelId).toBeNull()
    expect(state.navigation.steps).toEqual([])
    expect(state.isTransitioning).toBe(false)
  })

  it('setPanels auto-focuses root panel', () => {
    useDashboardStore.getState().setPanels(mockPanels)
    const state = useDashboardStore.getState()
    expect(state.panels).toEqual(mockPanels)
    expect(state.visiblePanelIds).toHaveLength(mockPanels.length)
    // Root panel is auto-focused on load
    expect(state.focusedPanelId).toBe('root')
    expect(state.navigation.steps).toHaveLength(1)
    expect(state.navigation.steps[0].panelId).toBe('root')
  })

  it('focusPanel sets focusedPanelId and pushes to navigation', () => {
    useDashboardStore.getState().setPanels(mockPanels)
    useDashboardStore.getState().focusPanel('p1')

    const state = useDashboardStore.getState()
    expect(state.focusedPanelId).toBe('p1')
    expect(state.isTransitioning).toBe(true)
  })

  it('focusPanel on already-focused panel is no-op', () => {
    useDashboardStore.getState().setPanels(mockPanels)
    useDashboardStore.getState().focusPanel('p1')
    useDashboardStore.getState().focusPanel('p1')

    const state = useDashboardStore.getState()
    expect(state.focusedPanelId).toBe('p1')
  })

  it('all panels remain visible regardless of focus', () => {
    useDashboardStore.getState().setPanels(mockPanels)
    useDashboardStore.getState().focusPanel('p2')

    const state = useDashboardStore.getState()
    expect(state.visiblePanelIds).toHaveLength(mockPanels.length)
    for (const p of mockPanels) {
      expect(state.visiblePanelIds).toContain(p.id)
    }
  })

  it('unfocus goes to root panel', () => {
    useDashboardStore.getState().setPanels(mockPanels)
    useDashboardStore.getState().focusPanel('p1')
    useDashboardStore.getState().unfocus()

    const state = useDashboardStore.getState()
    expect(state.focusedPanelId).toBe('root')
    expect(state.isTransitioning).toBe(true)
  })

  it('navigateTo pushes to navigation history', () => {
    useDashboardStore.getState().setPanels(mockPanels)
    useDashboardStore.getState().navigateTo('p1', 'x')
    useDashboardStore.getState().navigateTo('p2', 'x')

    const state = useDashboardStore.getState()
    expect(state.focusedPanelId).toBe('p2')
  })

  it('navigateTo truncates when revisiting a panel in the path', () => {
    useDashboardStore.getState().setPanels(mockPanels)
    useDashboardStore.getState().navigateTo('p1', 'x')
    useDashboardStore.getState().navigateTo('p2', 'x')
    useDashboardStore.getState().navigateTo('p3', 'x')
    // Revisit p1 — should truncate back to it
    useDashboardStore.getState().navigateTo('p1', 'x')

    const state = useDashboardStore.getState()
    expect(state.focusedPanelId).toBe('p1')
  })

  it('navigateBack goes to parent panel', () => {
    useDashboardStore.getState().setPanels(mockPanels)
    useDashboardStore.getState().focusPanel('p2-seg0')
    useDashboardStore.getState().navigateBack()

    const state = useDashboardStore.getState()
    expect(state.focusedPanelId).toBe('p2')
  })

  it('navigateBack from root is no-op', () => {
    useDashboardStore.getState().setPanels(mockPanels)
    // Root is auto-focused
    useDashboardStore.getState().navigateBack()

    const state = useDashboardStore.getState()
    expect(state.focusedPanelId).toBe('root')
  })

  it('navigateHome focuses root panel', () => {
    useDashboardStore.getState().setPanels(mockPanels)
    useDashboardStore.getState().focusPanel('p2-seg0')
    useDashboardStore.getState().navigateHome()

    const state = useDashboardStore.getState()
    expect(state.focusedPanelId).toBe('root')
    expect(state.visiblePanelIds).toHaveLength(mockPanels.length)
  })

  it('navigateToStep jumps and truncates forward steps', () => {
    useDashboardStore.getState().setPanels(mockPanels)
    useDashboardStore.getState().navigateTo('p1', 'x')
    useDashboardStore.getState().navigateTo('p2', 'x')
    useDashboardStore.getState().navigateTo('p3', 'x')
    useDashboardStore.getState().navigateToStep(0)

    const state = useDashboardStore.getState()
    expect(state.navigation.currentIndex).toBe(0)
    expect(state.navigation.steps).toHaveLength(1)
  })

  it('navigateToStep ignores out-of-range index', () => {
    useDashboardStore.getState().setPanels(mockPanels)
    useDashboardStore.getState().navigateTo('p1', 'x')
    useDashboardStore.getState().navigateToStep(50)

    const state = useDashboardStore.getState()
    expect(state.focusedPanelId).toBe('p1')
  })

  it('setTransitioning updates flag', () => {
    useDashboardStore.getState().setTransitioning(true)
    expect(useDashboardStore.getState().isTransitioning).toBe(true)
    useDashboardStore.getState().setTransitioning(false)
    expect(useDashboardStore.getState().isTransitioning).toBe(false)
  })
})
