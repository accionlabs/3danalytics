import { describe, it, expect, beforeEach } from 'vitest'
import { useDashboardStore } from '../store/dashboardStore.ts'
import type { PanelConfig } from '../types/index.ts'

const mockPanels: PanelConfig[] = [
  {
    id: 'home', title: 'Home Dashboard', chartType: 'kpi',
    size: { width: 3, height: 2 }, data: {},
    semantic: { processStep: 1, segment: null, detailLevel: 0 },
    processLabel: 'Home',
  },
  {
    id: 'marketing', title: 'Marketing Spend', chartType: 'bar',
    size: { width: 3, height: 2 }, data: {},
    semantic: { processStep: 0, segment: null, detailLevel: 1 },
    parentId: 'home', processLabel: 'Marketing',
  },
  {
    id: 'leads', title: 'Leads Generated', chartType: 'funnel',
    size: { width: 2.5, height: 2.5 }, data: {},
    semantic: { processStep: 1, segment: null, detailLevel: 1 },
    parentId: 'home', processLabel: 'Leads',
  },
  {
    id: 'pipeline', title: 'Pipeline Value', chartType: 'revenue',
    size: { width: 3, height: 2 }, data: {},
    semantic: { processStep: 2, segment: null, detailLevel: 1 },
    parentId: 'home', processLabel: 'Pipeline',
  },
  {
    id: 'leads-enterprise', title: 'Enterprise Leads', chartType: 'funnel',
    size: { width: 2.5, height: 2.5 }, data: {},
    semantic: { processStep: 1, segment: 2, detailLevel: 2 },
    parentId: 'leads', segmentLabel: 'Enterprise',
  },
  {
    id: 'leads-smb', title: 'SMB Leads', chartType: 'funnel',
    size: { width: 2.5, height: 2.5 }, data: {},
    semantic: { processStep: 1, segment: 1, detailLevel: 2 },
    parentId: 'leads', segmentLabel: 'SMB',
  },
  {
    id: 'pipeline-enterprise', title: 'Enterprise Pipeline', chartType: 'revenue',
    size: { width: 3, height: 2 }, data: {},
    semantic: { processStep: 2, segment: 2, detailLevel: 2 },
    parentId: 'pipeline', segmentLabel: 'Enterprise',
  },
]

describe('navigation history', () => {
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
    useDashboardStore.getState().setPanels(mockPanels)
  })

  it('setPanels auto-focuses root panel', () => {
    const store = useDashboardStore.getState
    expect(store().focusedPanelId).toBe('home')
    expect(store().navigation.steps).toHaveLength(1)
    expect(store().navigation.steps[0].panelId).toBe('home')
  })

  it('navigateTo builds history', () => {
    const store = useDashboardStore.getState
    store().navigateTo('marketing', 'x')
    store().navigateTo('leads', 'x')

    expect(store().focusedPanelId).toBe('leads')
  })

  it('navigateBack goes to parent panel', () => {
    const store = useDashboardStore.getState
    store().focusPanel('leads-enterprise')
    store().navigateBack()

    expect(store().focusedPanelId).toBe('leads')
  })

  it('navigateBack from root is no-op', () => {
    const store = useDashboardStore.getState
    // home has no parentId — back is no-op
    store().navigateBack()

    expect(store().focusedPanelId).toBe('home')
  })

  it('navigateBack chain walks up hierarchy', () => {
    const store = useDashboardStore.getState
    store().focusPanel('leads-enterprise')
    store().navigateBack() // → leads
    expect(store().focusedPanelId).toBe('leads')
    store().navigateBack() // → home (parent of leads)
    expect(store().focusedPanelId).toBe('home')
    store().navigateBack() // no-op (home is root)
    expect(store().focusedPanelId).toBe('home')
  })

  it('navigateForward does nothing at end of history', () => {
    const store = useDashboardStore.getState
    store().navigateTo('marketing', 'x')
    store().navigateForward()

    expect(store().focusedPanelId).toBe('marketing')
  })

  it('navigateBack then new navigation appends from parent', () => {
    const store = useDashboardStore.getState
    store().focusPanel('leads')
    store().focusPanel('leads-enterprise')
    store().navigateBack()
    expect(store().focusedPanelId).toBe('leads')

    store().navigateTo('leads-smb', 'y')
    const nav = store().navigation
    expect(nav.steps[nav.currentIndex].panelId).toBe('leads-smb')
  })

  it('navigateTo truncates when revisiting panel already in path', () => {
    const store = useDashboardStore.getState
    store().navigateTo('marketing', 'x')
    store().navigateTo('leads', 'x')
    store().navigateTo('pipeline', 'x')

    store().navigateTo('marketing', 'x')
    expect(store().focusedPanelId).toBe('marketing')
  })

  it('navigateHome focuses root panel', () => {
    const store = useDashboardStore.getState
    store().focusPanel('leads-enterprise')
    store().navigateHome()

    expect(store().focusedPanelId).toBe('home')
    expect(store().navigation.steps).toHaveLength(1)
    expect(store().navigation.steps[0].panelId).toBe('home')
  })

  it('focusPanel auto-detects axis from semantic coords', () => {
    const store = useDashboardStore.getState
    store().focusPanel('marketing')
    store().focusPanel('leads') // X changes

    expect(store().focusedPanelId).toBe('leads')
  })

  it('camera targets point to panel positions', () => {
    const store = useDashboardStore.getState
    store().navigateTo('marketing', 'x')

    const target = store().cameraTarget
    expect(target.position[2]).toBeGreaterThan(target.lookAt[2])
  })

  it('navigateToStep jumps and truncates forward steps', () => {
    const store = useDashboardStore.getState
    store().navigateTo('marketing', 'x')
    store().navigateTo('leads', 'x')
    store().navigateTo('pipeline', 'x')

    store().navigateToStep(0)
    expect(store().navigation.currentIndex).toBe(0)
    expect(store().navigation.steps).toHaveLength(1)
  })

  it('all panels remain visible at all times', () => {
    const store = useDashboardStore.getState
    expect(store().visiblePanelIds).toHaveLength(mockPanels.length)

    store().navigateTo('leads-enterprise', 'z')
    expect(store().visiblePanelIds).toHaveLength(mockPanels.length)

    store().navigateHome()
    expect(store().visiblePanelIds).toHaveLength(mockPanels.length)
  })
})
