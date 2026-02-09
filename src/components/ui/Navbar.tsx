import { useDashboardStore } from '../../store/dashboardStore.ts'
import type { LayoutType } from '../../types/index.ts'

const layouts: { type: LayoutType; label: string }[] = [
  { type: 'arc', label: 'Arc' },
  { type: 'grid', label: 'Grid' },
  { type: 'room', label: 'Room' },
]

export function Navbar() {
  const currentLayout = useDashboardStore((s) => s.layout)
  const setLayout = useDashboardStore((s) => s.setLayout)

  return (
    <nav
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 48,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        background: 'rgba(10, 10, 26, 0.6)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(60, 80, 120, 0.2)',
        zIndex: 100,
      }}
    >
      <div
        style={{
          color: '#c0d0e0',
          fontSize: 15,
          fontWeight: 700,
          letterSpacing: '0.5px',
        }}
      >
        3D Analytics
      </div>

      <div style={{ display: 'flex', gap: 4 }}>
        {layouts.map(({ type, label }) => (
          <button
            key={type}
            onClick={() => setLayout(type)}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
              transition: 'all 0.2s',
              background:
                currentLayout === type
                  ? 'rgba(59, 130, 246, 0.3)'
                  : 'rgba(30, 40, 60, 0.5)',
              color:
                currentLayout === type ? '#60a5fa' : '#6080a0',
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </nav>
  )
}
