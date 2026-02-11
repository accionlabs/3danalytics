import { useCallback, useMemo } from 'react'
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


const AXIS_COLOR = { x: '#3b82f6', y: '#10b981', z: '#f59e0b' } as const

interface NavigationHelperProps {
  /** Compact mode: icon-only buttons for mobile / touch fallback */
  compact?: boolean
}

export function NavigationHelper({ compact = false }: NavigationHelperProps) {
  const panels = useDashboardStore((s) => s.panels)
  const focusedPanelId = useDashboardStore((s) => s.focusedPanelId)
  const storeNavigateTo = useDashboardStore((s) => s.navigateTo)
  const current = panels.find((p) => p.id === focusedPanelId)

  // Blur active element after navigation so keyboard events return to canvas
  const navigateTo = useCallback(
    (id: string, axis: 'x' | 'y' | 'z') => {
      storeNavigateTo(id, axis)
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    },
    [storeNavigateTo],
  )

  const neighbors = useMemo(() => {
    if (!current) return null
    return computeNeighbors(panels, current)
  }, [panels, current])

  const { left, right, up, down, drillOut, drillIn } = neighbors ?? {
    left: null, right: null, up: null, down: null, drillOut: null, drillIn: [],
  }
  const firstChild = drillIn[0] ?? null

  // ── Compact mode: icon-only buttons with good touch targets ──
  if (compact) {
    const cBtn = (
      label: string,
      color: string,
      target: PanelConfig | null,
      axis: 'x' | 'y' | 'z',
    ): React.ReactNode => (
      <button
        key={label}
        disabled={!target}
        onClick={() => target && navigateTo(target.id, axis)}
        style={{
          background: target ? 'rgba(255,255,255,0.06)' : 'transparent',
          border: 'none',
          borderRadius: 6,
          color: target ? color : 'rgba(128,144,176,0.25)',
          fontSize: 16,
          fontWeight: 800,
          width: 32,
          height: 28,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: target ? 'pointer' : 'default',
          touchAction: 'manipulation',
        }}
        title={target ? target.title : undefined}
      >
        {label}
      </button>
    )

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {cBtn('‹', AXIS_COLOR.z, drillOut, 'z')}
        <div style={{ width: 1, height: 16, background: 'rgba(128,144,176,0.2)', margin: '0 2px' }} />
        {cBtn('←', AXIS_COLOR.x, left, 'x')}
        {cBtn('→', AXIS_COLOR.x, right, 'x')}
        <div style={{ width: 1, height: 16, background: 'rgba(128,144,176,0.2)', margin: '0 2px' }} />
        {cBtn('↑', AXIS_COLOR.y, up, 'y')}
        {cBtn('↓', AXIS_COLOR.y, down, 'y')}
        <div style={{ width: 1, height: 16, background: 'rgba(128,144,176,0.2)', margin: '0 2px' }} />
        {cBtn('›', AXIS_COLOR.z, firstChild, 'z')}
      </div>
    )
  }

  // ── Full mode: icon + title, pipe-separated ──
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
  const sc = (axis: 'x' | 'y' | 'z'): React.CSSProperties => ({
    color: AXIS_COLOR[axis],
    fontSize: 14,
    fontWeight: 800,
  })

  const items: React.ReactNode[] = []

  if (drillOut) {
    items.push(
      <button
        key="drillOut"
        onClick={() => navigateTo(drillOut.id, 'z')}
        style={{ ...btnStyle, color: AXIS_COLOR.z }}
      >
        <span style={{ ...sc('z'), marginRight: 4 }}>&lt;</span>
        {drillOut.title}
      </button>,
    )
  }
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
