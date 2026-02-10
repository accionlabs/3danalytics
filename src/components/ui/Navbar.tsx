export function Navbar() {
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
        padding: '0 20px',
        background: 'rgba(10, 10, 26, 0.6)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(60, 80, 120, 0.2)',
        zIndex: 10000,
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
    </nav>
  )
}
