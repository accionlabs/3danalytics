import { useDashboardStore } from '../../store/dashboardStore.ts'

export function Breadcrumbs() {
  const drillDownStack = useDashboardStore((s) => s.drillDownStack)
  const panels = useDashboardStore((s) => s.panels)
  const unfocus = useDashboardStore((s) => s.unfocus)
  const drillUp = useDashboardStore((s) => s.drillUp)

  if (drillDownStack.length === 0) return null

  const crumbs = drillDownStack.map((id) => {
    const panel = panels.find((p) => p.id === id)
    return { id, title: panel?.title ?? id }
  })

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 20,
        left: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 14px',
        background: 'rgba(10, 10, 26, 0.6)',
        backdropFilter: 'blur(12px)',
        borderRadius: 8,
        border: '1px solid rgba(60, 80, 120, 0.2)',
        zIndex: 100,
      }}
    >
      <button
        onClick={unfocus}
        style={{
          background: 'none',
          border: 'none',
          color: '#60a5fa',
          cursor: 'pointer',
          fontSize: 12,
          padding: '2px 4px',
        }}
      >
        Overview
      </button>

      {crumbs.map((crumb, i) => (
        <span key={crumb.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: '#3a4a60', fontSize: 12 }}>/</span>
          {i < crumbs.length - 1 ? (
            <button
              onClick={drillUp}
              style={{
                background: 'none',
                border: 'none',
                color: '#60a5fa',
                cursor: 'pointer',
                fontSize: 12,
                padding: '2px 4px',
              }}
            >
              {crumb.title}
            </button>
          ) : (
            <span style={{ color: '#8090b0', fontSize: 12 }}>
              {crumb.title}
            </span>
          )}
        </span>
      ))}
    </div>
  )
}
