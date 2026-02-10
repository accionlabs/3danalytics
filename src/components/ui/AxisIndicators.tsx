import { useState, useEffect, useRef } from 'react'
import { useDashboardStore } from '../../store/dashboardStore.ts'
import { useViewport } from '../../hooks/useViewport.ts'

export function AxisIndicators() {
  const focusedPanelId = useDashboardStore((s) => s.focusedPanelId)
  const panels = useDashboardStore((s) => s.panels)
  const navigation = useDashboardStore((s) => s.navigation)
  const { uiScale } = useViewport()

  const [visible, setVisible] = useState(false)
  const fadeTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const focusedPanel = panels.find((p) => p.id === focusedPanelId)

  // Show indicators on navigation, fade after 3s inactivity
  useEffect(() => {
    if (focusedPanelId) {
      setVisible(true)
      clearTimeout(fadeTimer.current)
      fadeTimer.current = setTimeout(() => setVisible(false), 3000)
    } else {
      setVisible(false)
    }
    return () => clearTimeout(fadeTimer.current)
  }, [focusedPanelId, navigation.currentIndex])

  if (!visible || !focusedPanel) return null

  const depthLevel = focusedPanel.semantic.detailLevel
  // Max detail level in the dataset
  const maxDepth = Math.max(...panels.map((p) => p.semantic.detailLevel))

  // Offsets computed from scaled chrome: navbar = 48*uiScale, bottom bar ≈ 36*uiScale at pos 12
  const topOffset = Math.round(48 * uiScale + 8)
  const rightOffset = 16
  const bottomOffset = Math.round(36 * uiScale + 8)

  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    padding: '6px 14px',
    background: 'rgba(10, 10, 26, 0.5)',
    backdropFilter: 'blur(8px)',
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.5px',
    zIndex: 10000,
    transition: 'opacity 0.4s ease',
    opacity: visible ? 0.8 : 0,
    pointerEvents: 'none',
  }

  return (
    <>
      {/* Top: Pipeline Stage (X-axis) */}
      <div
        style={{
          ...baseStyle,
          top: topOffset,
          left: '50%',
          transform: `translateX(-50%) scale(${uiScale})`,
          color: '#3b82f6',
        }}
      >
        {'\u2190'} Pipeline Stage {'\u2192'}
      </div>

      {/* Right: Segment (Y-axis) */}
      <div
        style={{
          ...baseStyle,
          right: rightOffset,
          top: '50%',
          transform: `translateY(-50%) scale(${uiScale})`,
          color: '#10b981',
          writingMode: 'vertical-rl',
          textOrientation: 'mixed',
        }}
      >
        {'\u2191'} Segment {'\u2193'}
      </div>

      {/* Bottom: Depth level (Z-axis) */}
      <div
        style={{
          ...baseStyle,
          bottom: bottomOffset,
          left: '50%',
          transform: `translateX(-50%) scale(${uiScale})`,
          color: '#f59e0b',
        }}
      >
        Depth: Level {depthLevel} of {maxDepth}
      </div>
    </>
  )
}
