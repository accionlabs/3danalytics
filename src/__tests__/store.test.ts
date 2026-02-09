import { describe, it, expect, beforeEach } from 'vitest'
import { useDashboardStore } from '../store/dashboardStore.ts'
import type { PanelConfig } from '../types/index.ts'

const mockPanels: PanelConfig[] = [
  { id: 'p1', title: 'Panel 1', chartType: 'test', size: { width: 3, height: 2 }, data: {} },
  { id: 'p2', title: 'Panel 2', chartType: 'test', size: { width: 3, height: 2 }, data: {} },
  { id: 'p3', title: 'Panel 3', chartType: 'test', size: { width: 3, height: 2 }, data: {} },
]

describe('dashboardStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    useDashboardStore.setState({
      panels: [],
      layout: 'arc',
      focusedPanelId: null,
      drillDownStack: [],
      cameraTarget: { position: [0, 0, 0], lookAt: [0, 0, -8] },
      isTransitioning: false,
    })
  })

  it('starts with default state', () => {
    const state = useDashboardStore.getState()
    expect(state.panels).toEqual([])
    expect(state.layout).toBe('arc')
    expect(state.focusedPanelId).toBeNull()
    expect(state.drillDownStack).toEqual([])
    expect(state.isTransitioning).toBe(false)
  })

  it('setPanels updates panels', () => {
    useDashboardStore.getState().setPanels(mockPanels)
    expect(useDashboardStore.getState().panels).toEqual(mockPanels)
  })

  it('setLayout changes layout and updates camera', () => {
    useDashboardStore.getState().setLayout('grid')
    expect(useDashboardStore.getState().layout).toBe('grid')
  })

  it('focusPanel sets focusedPanelId and pushes to stack', () => {
    useDashboardStore.getState().setPanels(mockPanels)
    useDashboardStore.getState().focusPanel('p1')

    const state = useDashboardStore.getState()
    expect(state.focusedPanelId).toBe('p1')
    expect(state.drillDownStack).toEqual(['p1'])
    expect(state.isTransitioning).toBe(true)
  })

  it('unfocus returns to overview', () => {
    useDashboardStore.getState().setPanels(mockPanels)
    useDashboardStore.getState().focusPanel('p1')
    useDashboardStore.getState().unfocus()

    const state = useDashboardStore.getState()
    expect(state.focusedPanelId).toBeNull()
    expect(state.drillDownStack).toEqual([])
    expect(state.isTransitioning).toBe(true)
  })

  it('drillDown adds to stack', () => {
    useDashboardStore.getState().setPanels(mockPanels)
    useDashboardStore.getState().drillDown('p1')
    useDashboardStore.getState().drillDown('p2')

    const state = useDashboardStore.getState()
    expect(state.focusedPanelId).toBe('p2')
    expect(state.drillDownStack).toEqual(['p1', 'p2'])
  })

  it('drillUp pops from stack', () => {
    useDashboardStore.getState().setPanels(mockPanels)
    useDashboardStore.getState().drillDown('p1')
    useDashboardStore.getState().drillDown('p2')
    useDashboardStore.getState().drillUp()

    const state = useDashboardStore.getState()
    expect(state.focusedPanelId).toBe('p1')
    expect(state.drillDownStack).toEqual(['p1'])
  })

  it('drillUp from single item returns to overview', () => {
    useDashboardStore.getState().setPanels(mockPanels)
    useDashboardStore.getState().drillDown('p1')
    useDashboardStore.getState().drillUp()

    const state = useDashboardStore.getState()
    expect(state.focusedPanelId).toBeNull()
    expect(state.drillDownStack).toEqual([])
  })

  it('setTransitioning updates flag', () => {
    useDashboardStore.getState().setTransitioning(true)
    expect(useDashboardStore.getState().isTransitioning).toBe(true)
    useDashboardStore.getState().setTransitioning(false)
    expect(useDashboardStore.getState().isTransitioning).toBe(false)
  })
})
