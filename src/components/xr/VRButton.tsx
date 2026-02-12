import { useState, useEffect } from 'react'
import { xrStore } from '../../xr/xrStore.ts'

/**
 * "Enter VR" button with status feedback.
 * Uses the WebXR API directly (not useXR hooks) because this component
 * renders outside the Canvas/<XR> provider.
 */
export function VRButton() {
  const [supported, setSupported] = useState<boolean | null>(null)
  const [status, setStatus] = useState('')

  useEffect(() => {
    if (!navigator.xr) {
      setSupported(false)
      setStatus('No WebXR API')
      return
    }
    navigator.xr.isSessionSupported('immersive-vr').then(
      (ok) => {
        setSupported(ok)
        setStatus(ok ? 'Ready' : 'Not supported')
      },
      (err) => {
        setSupported(false)
        setStatus(`Check failed: ${err}`)
      },
    )
  }, [])

  const handleClick = async () => {
    if (!supported) return
    setStatus('Requesting...')
    try {
      const session = await xrStore.enterVR()
      if (session) {
        setStatus('OK: immersive-vr')
      } else {
        setStatus('Session=null')
      }
    } catch (err) {
      setStatus(`FAIL: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const isReady = supported === true

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <button
        onClick={handleClick}
        disabled={!isReady}
        style={{
          background: isReady ? 'rgba(96, 165, 250, 0.15)' : 'none',
          border: `1px solid ${isReady ? 'rgba(96, 165, 250, 0.5)' : 'rgba(100, 100, 100, 0.3)'}`,
          color: isReady ? '#60a5fa' : '#666',
          fontSize: 12,
          cursor: isReady ? 'pointer' : 'default',
          padding: '3px 8px',
          borderRadius: 4,
          fontWeight: 600,
        }}
      >
        Enter VR
      </button>
      <span style={{ fontSize: 10, color: '#f0a040', maxWidth: 200, overflow: 'hidden', whiteSpace: 'nowrap' }}>
        {status}
      </span>
    </div>
  )
}
