import { useState, useEffect } from 'react'
import { useDashboardStore } from '../../store/dashboardStore.ts'

export function Navbar() {
  const isVRMode = useDashboardStore((s) => s.isVRMode)
  const [xrStore, setXrStore] = useState<any>(null)

  // Get XR store from window (set by App.tsx)
  useEffect(() => {
    // Wait for XR store to be available
    const checkForXR = setInterval(() => {
      if ((window as any).__xrStore) {
        setXrStore((window as any).__xrStore)
        clearInterval(checkForXR)
      }
    }, 100)
    return () => clearInterval(checkForXR)
  }, [])

  const handleVRToggle = async () => {
    if (!xrStore) return

    try {
      if (isVRMode) {
        // Exit VR
        const session = xrStore.getState().session
        if (session) {
          await session.end()
        }
      } else {
        // Request VR wrapper to mount first (this enables XR in @react-three/xr)
        if ((window as any).__requestVR) {
          (window as any).__requestVR()
        }

        // Wait for XR wrapper to mount
        await new Promise(resolve => setTimeout(resolve, 200))

        // Check if WebXR is now available (might be enabled by XR component)
        if (!navigator.xr) {
          throw new Error('WebXR is not supported. Ensure you are using:\n\n' +
            '1. Quest Browser (on Meta Quest)\n' +
            '2. Chrome with WebXR Emulator (on desktop)\n' +
            '3. HTTPS (not http://)\n\n' +
            'Current protocol: ' + window.location.protocol)
        }

        // Check if immersive-vr is supported
        const isVRSupported = await navigator.xr.isSessionSupported('immersive-vr')
        if (!isVRSupported) {
          throw new Error('Immersive VR mode is not supported on this device.\n\n' +
            'Make sure:\n' +
            '1. You\'re using Quest Browser (not Firefox)\n' +
            '2. Quest firmware is up to date\n' +
            '3. Page is loaded over HTTPS')
        }

        // Enter VR with explicit immersive-vr mode
        console.log('[VR] Requesting immersive-vr session...')
        await xrStore.enterVR()
      }
    } catch (error) {
      console.error('Failed to toggle VR mode:', error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      alert(`Failed to enter VR mode:\n\n${errorMessage}`)
    }
  }

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

      <button
        onClick={handleVRToggle}
        style={{
          padding: '6px 16px',
          background: isVRMode ? 'rgba(100, 200, 255, 0.2)' : 'rgba(60, 80, 120, 0.2)',
          border: isVRMode ? '1px solid rgba(100, 200, 255, 0.5)' : '1px solid rgba(60, 80, 120, 0.3)',
          borderRadius: 6,
          color: isVRMode ? '#64c8ff' : '#c0d0e0',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = isVRMode ? 'rgba(100, 200, 255, 0.3)' : 'rgba(60, 80, 120, 0.3)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = isVRMode ? 'rgba(100, 200, 255, 0.2)' : 'rgba(60, 80, 120, 0.2)'
        }}
      >
        <span>{isVRMode ? '🥽' : '🖥️'}</span>
        <span>{isVRMode ? 'Exit VR' : 'Enter VR'}</span>
      </button>
    </nav>
  )
}
