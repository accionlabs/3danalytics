export function LoadingScreen() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a1a',
        zIndex: 100,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          border: '3px solid #1e2a40',
          borderTop: '3px solid #3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p
        style={{
          marginTop: 16,
          color: '#6080a0',
          fontSize: 14,
          letterSpacing: '0.5px',
        }}
      >
        Loading Dashboard...
      </p>
    </div>
  )
}
