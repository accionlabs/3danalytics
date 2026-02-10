import { useEffect } from 'react'
import { useViewport } from '../../hooks/useViewport.ts'

interface HelpPopupProps {
  open: boolean
  onClose: () => void
}

const kbd: React.CSSProperties = {
  color: '#f59e0b',
  fontFamily: 'monospace',
  fontSize: 12,
  whiteSpace: 'nowrap',
}

const desc: React.CSSProperties = {
  color: '#8090b0',
  fontSize: 12,
}

const sectionHeader: React.CSSProperties = {
  color: '#60a5fa',
  fontSize: 13,
  fontWeight: 700,
  margin: '14px 0 6px',
}

const row: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '3px 0',
}

function Row({ keys, action }: { keys: string; action: string }) {
  return (
    <div style={row}>
      <span style={kbd}>{keys}</span>
      <span style={desc}>{action}</span>
    </div>
  )
}

export function HelpPopup({ open, onClose }: HelpPopupProps) {
  const { isMobile, isTablet } = useViewport()
  const isCompact = isMobile || isTablet

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 10001,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'rgba(10, 10, 26, 0.95)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(60, 80, 120, 0.3)',
          borderRadius: 10,
          maxWidth: 520,
          width: '90vw',
          padding: isCompact ? '14px 16px' : '20px 24px',
          position: 'relative',
          ...(isCompact ? { maxHeight: '80vh', overflowY: 'auto' as const } : {}),
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
          }}
        >
          <div style={{ color: '#c0d0e0', fontSize: 16, fontWeight: 700 }}>
            Navigation Help
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#8090b0',
              fontSize: 18,
              cursor: 'pointer',
              padding: '0 4px',
              lineHeight: 1,
            }}
          >
            &times;
          </button>
        </div>

        <div style={sectionHeader}>Keyboard</div>
        <Row keys="Arrow Left / Right" action="Navigate pipeline stages (X)" />
        <Row keys="Arrow Up / Down" action="Navigate segments (Y)" />
        <Row keys=".  or  >" action="Drill deeper (Z)" />
        <Row keys=",  or  <" action="Drill out to parent" />
        <Row keys="Backspace" action="Go back in history" />
        <Row keys="Home" action="Return to overview" />
        <Row keys="Escape" action="Close help / unfocus panel" />

        <div style={sectionHeader}>Mouse</div>
        <Row keys="Click panel" action="Focus / drill into panel" />
        <Row keys="Click chart bar" action="Drill to child panel" />
        <Row keys="Right-click" action="Drill out to parent" />
        <Row keys="Left-click drag" action="Pan camera" />

        <div style={sectionHeader}>Trackpad / Scroll</div>
        <Row keys="Horizontal scroll" action="Navigate pipeline stages (X)" />
        <Row keys="Vertical scroll" action="Navigate segments (Y)" />
        <Row keys="Ctrl/Cmd + scroll" action="Zoom in/out" />

        {isCompact && (
          <>
            <div style={sectionHeader}>Touch Gestures</div>
            <Row keys="Tap panel" action="Focus / drill into panel" />
            <Row keys="Double tap" action="Drill out to parent" />
            <Row keys="Two-finger tap" action="Drill out to parent" />
            <Row keys="Swipe left / right" action="Navigate pipeline stages (X)" />
            <Row keys="Swipe up / down" action="Navigate segments (Y)" />
            <Row keys="Pinch in / out" action="Zoom camera" />
            <Row keys="One-finger drag" action="Pan camera" />
          </>
        )}
      </div>
    </div>
  )
}
