import { useEffect } from 'react'
import { useDashboardStore } from '../store/dashboardStore.ts'
import type { PanelConfig } from '../types/index.ts'

/** Find the nearest neighbor panel along an axis */
export function findNeighbor(
  panels: PanelConfig[],
  current: PanelConfig,
  axis: 'x' | 'y' | 'z',
  direction: 1 | -1,
): PanelConfig | null {
  const { processStep, segment, detailLevel } = current.semantic
  const currentSeg = segment ?? 0

  let candidates: PanelConfig[]

  if (axis === 'x') {
    // Same Y and Z, different X
    candidates = panels.filter(
      (p) =>
        (p.semantic.segment ?? 0) === currentSeg &&
        p.semantic.detailLevel === detailLevel &&
        p.id !== current.id,
    )
    candidates.sort((a, b) => a.semantic.processStep - b.semantic.processStep)
    if (direction === 1) {
      return candidates.find((p) => p.semantic.processStep > processStep) ?? null
    } else {
      return candidates.reverse().find((p) => p.semantic.processStep < processStep) ?? null
    }
  }

  if (axis === 'y') {
    // Same X and Z, different Y
    candidates = panels.filter(
      (p) =>
        p.semantic.processStep === processStep &&
        p.semantic.detailLevel === detailLevel &&
        p.id !== current.id &&
        p.semantic.segment !== null,
    )
    candidates.sort((a, b) => (a.semantic.segment ?? 0) - (b.semantic.segment ?? 0))
    if (direction === 1) {
      return candidates.find((p) => (p.semantic.segment ?? 0) > currentSeg) ?? null
    } else {
      return candidates.reverse().find((p) => (p.semantic.segment ?? 0) < currentSeg) ?? null
    }
  }

  if (axis === 'z') {
    const targetLevel = detailLevel + direction
    if (targetLevel < 0) return null
    // Same X position, target depth level
    candidates = panels.filter(
      (p) =>
        p.semantic.processStep === processStep &&
        p.semantic.detailLevel === targetLevel,
    )
    if (candidates.length === 0) return null
    // Prefer same segment, otherwise first available
    return (
      candidates.find((p) => (p.semantic.segment ?? 0) === currentSeg) ??
      candidates[0]
    )
  }

  return null
}

export function useKeyboardNavigation() {
  const panels = useDashboardStore((s) => s.panels)
  const focusedPanelId = useDashboardStore((s) => s.focusedPanelId)
  const visiblePanelIds = useDashboardStore((s) => s.visiblePanelIds)
  const navigateTo = useDashboardStore((s) => s.navigateTo)
  const navigateBack = useDashboardStore((s) => s.navigateBack)
  const navigateHome = useDashboardStore((s) => s.navigateHome)
  const focusPanel = useDashboardStore((s) => s.focusPanel)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      const current = panels.find((p) => p.id === focusedPanelId)

      switch (e.key) {
        case 'ArrowRight': {
          if (!current) {
            // No focus — focus first visible panel
            const firstVisible = panels.find((p) => visiblePanelIds.includes(p.id))
            if (firstVisible) focusPanel(firstVisible.id)
            return
          }
          const neighbor = findNeighbor(panels, current, 'x', 1)
          if (neighbor) navigateTo(neighbor.id, 'x')
          break
        }
        case 'ArrowLeft': {
          if (!current) return
          const neighbor = findNeighbor(panels, current, 'x', -1)
          if (neighbor) navigateTo(neighbor.id, 'x')
          break
        }
        case 'ArrowUp': {
          if (!current) return
          const neighbor = findNeighbor(panels, current, 'y', 1)
          if (neighbor) navigateTo(neighbor.id, 'y')
          break
        }
        case 'ArrowDown': {
          if (!current) return
          const neighbor = findNeighbor(panels, current, 'y', -1)
          if (neighbor) navigateTo(neighbor.id, 'y')
          break
        }
        case '.':
        case '>': {
          // Drill deeper (Z+1)
          if (!current) return
          const neighbor = findNeighbor(panels, current, 'z', 1)
          if (neighbor) navigateTo(neighbor.id, 'z')
          break
        }
        case ',':
        case '<': {
          // Drill out — go to parent panel in hierarchy
          if (!current) return
          navigateBack()
          break
        }
        case 'Backspace': {
          e.preventDefault()
          navigateBack()
          break
        }
        case 'Home': {
          navigateHome()
          break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [panels, focusedPanelId, visiblePanelIds, navigateTo, navigateBack, navigateHome, focusPanel])
}
