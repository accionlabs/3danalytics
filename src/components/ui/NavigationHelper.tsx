import { useMemo } from 'react'
import { useDashboardStore } from '../../store/dashboardStore.ts'
import { findNeighbor } from '../../hooks/useKeyboardNavigation.ts'
import type { PanelConfig } from '../../types/index.ts'

export interface NavigationNeighbors {
  left: PanelConfig | null
  right: PanelConfig | null
  up: PanelConfig | null
  down: PanelConfig | null
  drillOut: PanelConfig | null
  drillIn: PanelConfig[]
}

/** Pure function: compute all neighbors for a given panel */
export function computeNeighbors(
  panels: PanelConfig[],
  current: PanelConfig,
): NavigationNeighbors {
  return {
    left: findNeighbor(panels, current, 'x', -1),
    right: findNeighbor(panels, current, 'x', 1),
    up: findNeighbor(panels, current, 'y', 1),
    down: findNeighbor(panels, current, 'y', -1),
    drillOut: current.parentId
      ? panels.find((p) => p.id === current.parentId) ?? null
      : null,
    drillIn: panels.filter((p) => p.parentId === current.id),
  }
}


const btnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: 12,
  padding: '2px 4px',
  whiteSpace: 'nowrap',
}

const pipeStyle: React.CSSProperties = {
  color: '#8090b0',
  fontSize: 12,
  margin: '0 2px',
  userSelect: 'none',
}

const AXIS_COLOR = { x: '#3b82f6', y: '#10b981', z: '#f59e0b' } as const

export function NavigationHelper() {
  const panels = useDashboardStore((s) => s.panels)
  const focusedPanelId = useDashboardStore((s) => s.focusedPanelId)
  const navigateTo = useDashboardStore((s) => s.navigateTo)
  const current = panels.find((p) => p.id === focusedPanelId)

  const neighbors = useMemo(() => {
    if (!current) return null
    return computeNeighbors(panels, current)
  }, [panels, current])

  if (!current || !neighbors) return null

  const { left, right, up, down, drillIn } = neighbors

  // Build flat list of navigation items
  const items: React.ReactNode[] = []

  const sc = (axis: 'x' | 'y' | 'z'): React.CSSProperties => ({
    color: AXIS_COLOR[axis],
    fontSize: 14,
    fontWeight: 800,
  })

  if (left) {
    items.push(
      <button
        key="left"
        onClick={() => navigateTo(left.id, 'x')}
        style={{ ...btnStyle, color: AXIS_COLOR.x }}
      >
        <span style={{ ...sc('x'), marginRight: 4 }}>←</span>
        {left.title}
      </button>,
    )
  }
  if (right) {
    items.push(
      <button
        key="right"
        onClick={() => navigateTo(right.id, 'x')}
        style={{ ...btnStyle, color: AXIS_COLOR.x }}
      >
        <span style={{ ...sc('x'), marginRight: 4 }}>→</span>
        {right.title}
      </button>,
    )
  }
  if (up) {
    items.push(
      <button
        key="up"
        onClick={() => navigateTo(up.id, 'y')}
        style={{ ...btnStyle, color: AXIS_COLOR.y }}
      >
        <span style={{ ...sc('y'), marginRight: 4 }}>↑</span>
        {up.title}
      </button>,
    )
  }
  if (down) {
    items.push(
      <button
        key="down"
        onClick={() => navigateTo(down.id, 'y')}
        style={{ ...btnStyle, color: AXIS_COLOR.y }}
      >
        <span style={{ ...sc('y'), marginRight: 4 }}>↓</span>
        {down.title}
      </button>,
    )
  }
  for (const child of drillIn) {
    items.push(
      <button
        key={`drill-${child.id}`}
        onClick={() => navigateTo(child.id, 'z')}
        style={{ ...btnStyle, color: AXIS_COLOR.z }}
      >
        <span style={{ ...sc('z'), marginRight: 4 }}>&gt;</span>
        {child.title}
      </button>,
    )
  }

  if (items.length === 0) return null

  return (
    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
      {items.map((item, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center' }}>
          <span style={pipeStyle}>|</span>
          {item}
        </span>
      ))}
    </div>
  )
}
