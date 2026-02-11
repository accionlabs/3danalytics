import { useViewport } from '../../hooks/useViewport.ts'

interface NavbarProps {
  onHelpClick?: () => void
}

export function Navbar({ onHelpClick }: NavbarProps) {
  const { uiScale } = useViewport()

  return (
    <nav
      data-ui-chrome
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: `${100 / uiScale}%`,
        height: 48,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        background: 'rgba(10, 10, 26, 0.6)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(60, 80, 120, 0.2)',
        zIndex: 10000,
        transform: `scale(${uiScale})`,
        transformOrigin: 'top left',
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
      {onHelpClick && (
        <button
          onClick={onHelpClick}
          style={{
            background: 'none',
            border: 'none',
            color: '#60a5fa',
            fontSize: 16,
            cursor: 'pointer',
            padding: '4px 8px',
            fontWeight: 700,
          }}
          title="Navigation help (?)"
        >
          ?
        </button>
      )}
    </nav>
  )
}
