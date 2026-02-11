import { Suspense, useEffect, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { XR, createXRStore } from '@react-three/xr'
import { DashboardScene } from './components/scene/DashboardScene.tsx'
import { Navbar } from './components/ui/Navbar.tsx'
import { Breadcrumbs } from './components/ui/Breadcrumbs.tsx'
import { LoadingScreen } from './components/ui/LoadingScreen.tsx'
import { useDashboardStore } from './store/dashboardStore.ts'
import { defaultPanels } from './data/mockData.ts'
import { useKeyboardNavigation } from './hooks/useKeyboardNavigation.ts'
import { AxisIndicators } from './components/ui/AxisIndicators.tsx'
import { NavigationHelper } from './components/ui/NavigationHelper.tsx'

export default function App() {
  const setPanels = useDashboardStore((s) => s.setPanels)
  const setVRMode = useDashboardStore((s) => s.setVRMode)
  const [vrRequested, setVrRequested] = useState(false)

  useKeyboardNavigation()

  // Create XR store for VR session management with explicit mode
  const xrStore = useMemo(() => {
    const store = createXRStore()
    // Ensure store is configured for immersive-vr
    return store
  }, [])

  // Expose XR store and VR request handler to window for Navbar access
  useEffect(() => {
    ;(window as any).__xrStore = xrStore
    ;(window as any).__requestVR = () => setVrRequested(true)
    return () => {
      delete (window as any).__xrStore
      delete (window as any).__requestVR
    }
  }, [xrStore])

  useEffect(() => {
    setPanels(defaultPanels)
  }, [setPanels])

  // Listen for XR session state changes to sync with our VR mode state
  useEffect(() => {
    if (!vrRequested) return

    // Initialize from actual store state to avoid false triggers
    const initialState = xrStore.getState()
    let lastSessionState = initialState.session !== null

    // Force exit any existing session on mount
    if (initialState.session !== null && initialState.session !== undefined) {
      console.warn('[VR] WARNING: XR session exists on mount, forcing exit')
      initialState.session.end().catch(console.error)
      setVRMode(false)
    } else {
      // Ensure VR mode matches actual session state
      setVRMode(lastSessionState)
    }

    const unsubscribe = xrStore.subscribe((state) => {
      const hasSession = state.session !== null
      // Only update if session state actually changed
      if (hasSession !== lastSessionState) {
        console.log('[VR] Session state changed:', hasSession ? 'ACTIVE' : 'INACTIVE')
        lastSessionState = hasSession
        setVRMode(hasSession)
      }
    })

    return unsubscribe
  }, [xrStore, setVRMode, vrRequested])

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        background: '#0a0a1a',
      }}
    >
      <Suspense fallback={<LoadingScreen />}>
        <Canvas
          camera={{ position: [0, 0, 6], fov: 60, near: 0.1, far: 200 }}
          gl={{ antialias: true, alpha: false, powerPreference: 'default' }}
          dpr={[1, 1.5]}
          style={{ background: '#0a0a1a' }}
        >
          {vrRequested ? (
            <XR store={xrStore}>
              <DashboardScene key="scene" />
            </XR>
          ) : (
            <DashboardScene key="scene" />
          )}
        </Canvas>
      </Suspense>

      <Navbar />
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          left: 20,
          display: 'flex',
          alignItems: 'center',
          padding: '8px 14px',
          background: 'rgba(10, 10, 26, 0.6)',
          backdropFilter: 'blur(12px)',
          borderRadius: 8,
          border: '1px solid rgba(60, 80, 120, 0.2)',
          zIndex: 10000,
          maxWidth: 'calc(100vw - 40px)',
        }}
      >
        <Breadcrumbs />
        <NavigationHelper />
      </div>
      <AxisIndicators />
    </div>
  )
}
