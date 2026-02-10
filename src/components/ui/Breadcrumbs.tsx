import { useMemo } from 'react'
import { useDashboardStore } from '../../store/dashboardStore.ts'

export function Breadcrumbs() {
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

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {chain.map((item, i) => {
        const isFirst = i === 0
        const isLast = i === chain.length - 1

        return (
          <span key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Separator between items (not before first) */}
            {!isFirst && (
              <span style={{ color: '#f59e0b', fontSize: 12, fontWeight: 700 }}>
                {'\u25b7'}
              </span>
            )}
            {isFirst && !isLast ? (
              /* Root panel — home anchor */
              <button
                onClick={navigateHome}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#60a5fa',
                  cursor: 'pointer',
                  fontSize: 12,
                  padding: '2px 4px',
                  fontWeight: 600,
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
                  fontSize: 12,
                  padding: '2px 4px',
                }}
              >
                {item.title}
              </button>
            ) : (
              /* Current panel — static */
              <span style={{ color: '#8090b0', fontSize: 12 }}>
                {item.title}
              </span>
            )}
          </span>
        )
      })}
    </div>
  )
}
