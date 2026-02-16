import { useDashboardStore } from '../../store/dashboardStore'

interface MinimapProps {
  open: boolean
  onClose: () => void
}

export function Minimap({ open, onClose }: MinimapProps) {
  const panels = useDashboardStore((s) => s.panels)
  const focusedPanelId = useDashboardStore((s) => s.focusedPanelId)
  const focusPanel = useDashboardStore((s) => s.focusPanel)

  if (!open) return null

  const handlePanelClick = (panelId: string) => {
    focusPanel(panelId)
    onClose()
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0, 0, 0, 0.8)',
        zIndex: 20000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#1a1a2e',
          border: '1px solid rgba(60, 80, 120, 0.3)',
          borderRadius: '8px',
          padding: '24px',
          maxWidth: '600px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
          }}
        >
          <h2 style={{ color: '#e0e0ff', fontSize: '18px', margin: 0 }}>
            Dashboard Map
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#8090b0',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '0 8px',
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '12px',
          }}
        >
          {panels.map((panel) => (
            <div
              key={panel.id}
              onClick={() => handlePanelClick(panel.id)}
              style={{
                background:
                  focusedPanelId === panel.id
                    ? 'rgba(80, 120, 255, 0.15)'
                    : 'rgba(30, 40, 60, 0.5)',
                border:
                  focusedPanelId === panel.id
                    ? '2px solid rgba(80, 120, 255, 0.6)'
                    : '1px solid rgba(60, 80, 120, 0.3)',
                borderRadius: '6px',
                padding: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background =
                  focusedPanelId === panel.id
                    ? 'rgba(80, 120, 255, 0.25)'
                    : 'rgba(40, 50, 70, 0.7)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background =
                  focusedPanelId === panel.id
                    ? 'rgba(80, 120, 255, 0.15)'
                    : 'rgba(30, 40, 60, 0.5)'
              }}
            >
              <div
                style={{
                  color: '#e0e0ff',
                  fontSize: '14px',
                  fontWeight: 500,
                  marginBottom: '4px',
                }}
              >
                {panel.title}
              </div>
              <div
                style={{
                  color: '#8090b0',
                  fontSize: '12px',
                }}
              >
                {panel.chartType}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid rgba(60, 80, 120, 0.2)',
            color: '#8090b0',
            fontSize: '12px',
          }}
        >
          Click a panel to navigate • Press <kbd style={{
            background: 'rgba(60, 80, 120, 0.2)',
            padding: '2px 6px',
            borderRadius: '3px',
            fontFamily: 'monospace',
          }}>M</kbd> to toggle
        </div>
      </div>
    </div>
  )
}
