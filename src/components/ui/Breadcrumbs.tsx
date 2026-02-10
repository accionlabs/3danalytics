import { useMemo } from 'react'
import { useDashboardStore } from '../../store/dashboardStore.ts'

interface BreadcrumbsProps {
  isMobile?: boolean
}

export function Breadcrumbs({ isMobile }: BreadcrumbsProps) {
  const panels = useDashboardStore((s) => s.panels)
  const focusedPanelId = useDashboardStore((s) => s.focusedPanelId)
  const focusPanel = useDashboardStore((s) => s.focusPanel)
  const navigateHome = useDashboardStore((s) => s.navigateHome)

  // Build ancestry chain by walking parentId from the focused panel to root
  const chain = useMemo(() => {
    if (!focusedPanelId) return []
    const result: { id: string; title: string }[] = []
    let id: string | undefined = focusedPanelId
    while (id) {
      const panel = panels.find((p) => p.id === id)
      if (!panel) break
      result.unshift({ id: panel.id, title: panel.title })
      id = panel.parentId
    }
    return result
  }, [panels, focusedPanelId])

  if (chain.length === 0) return null

  // Parent container applies CSS transform: scale(uiScale) — use desktop sizes
  const fontSize = 12
  const gap = 6

  // On mobile with > 2 items, collapse middle items to "..."
  const displayChain = isMobile && chain.length > 2
    ? [chain[0], { id: '__ellipsis', title: '\u2026' }, chain[chain.length - 1]]
    : chain

  const truncateStyle: React.CSSProperties | undefined = isMobile
    ? { maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
    : undefined

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap }}>
      {displayChain.map((item, i) => {
        const isFirst = i === 0
        const isLast = i === displayChain.length - 1
        const isEllipsis = item.id === '__ellipsis'

        return (
          <span key={item.id} style={{ display: 'flex', alignItems: 'center', gap }}>
            {/* Separator between items (not before first) */}
            {!isFirst && (
              <span style={{ color: '#f59e0b', fontSize, fontWeight: 700 }}>
                {'\u25b7'}
              </span>
            )}
            {isEllipsis ? (
              <span style={{ color: '#8090b0', fontSize }}>{item.title}</span>
            ) : isFirst && !isLast ? (
              /* Root panel — home anchor */
              <button
                onClick={navigateHome}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#60a5fa',
                  cursor: 'pointer',
                  fontSize,
                  padding: '2px 4px',
                  fontWeight: 600,
                  ...truncateStyle,
                }}
              >
                {item.title}
              </button>
            ) : !isLast ? (
              /* Intermediate ancestor — clickable */
              <button
                onClick={() => focusPanel(item.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#60a5fa',
                  cursor: 'pointer',
                  fontSize,
                  padding: '2px 4px',
                  ...truncateStyle,
                }}
              >
                {item.title}
              </button>
            ) : (
              /* Current panel — static */
              <span style={{ color: '#8090b0', fontSize, ...truncateStyle }}>
                {item.title}
              </span>
            )}
          </span>
        )
      })}
    </div>
  )
}
