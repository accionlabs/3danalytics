import { Component, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import { Canvas } from '@react-three/fiber'
import { XR } from '@react-three/xr'
import { DashboardScene } from './components/scene/DashboardScene.tsx'
import { Navbar } from './components/ui/Navbar.tsx'
import { Breadcrumbs } from './components/ui/Breadcrumbs.tsx'
import { LoadingScreen } from './components/ui/LoadingScreen.tsx'
import { useDashboardStore } from './store/dashboardStore.ts'
import { defaultPanels } from './data/mockData.ts'
import { embedPanels } from './data/embedMockData.ts'
import { useKeyboardNavigation } from './hooks/useKeyboardNavigation.ts'
import { AxisIndicators } from './components/ui/AxisIndicators.tsx'
import { NavigationHelper } from './components/ui/NavigationHelper.tsx'
import { HelpPopup } from './components/ui/HelpPopup.tsx'
import { Minimap } from './components/ui/Minimap.tsx'
import { useViewport } from './hooks/useViewport.ts'
import { xrStore } from './xr/xrStore.ts'
import { VRButton } from './components/xr/VRButton.tsx'
import { OffscreenChartRenderer } from './xr/OffscreenChartRenderer.tsx'

/**
 * Error boundary for the Canvas — catches WebGL context loss crashes
 * (e.g. from EffectComposer during XR session transitions) and recovers
 * by remounting the Canvas after a short delay.
 */
class CanvasErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('[CanvasErrorBoundary] WebGL context error, recovering...', error.message, info.componentStack)
    // Auto-recover after a short delay (context usually restores quickly)
    setTimeout(() => this.setState({ hasError: false }), 500)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#607090',
          fontSize: 14,
          background: '#0a0a1a',
        }}>
          Recovering WebGL context...
        </div>
      )
    }
    return this.props.children
  }
}

export default function App() {
  const setPanels = useDashboardStore((s) => s.setPanels)
  const [helpOpen, setHelpOpen] = useState(false)
  const [minimapOpen, setMinimapOpen] = useState(false)
  const { isMobile, uiScale } = useViewport()

  // XR session state — subscribe to xrStore outside Canvas
  const [isInXR, setIsInXR] = useState(false)
  useEffect(() => {
    return xrStore.subscribe((state) => {
      setIsInXR(state.mode != null)
    })
  }, [])

  // ?mode=local uses built-in charts; default uses embed (iframes from reports repo)
  const panels = useMemo(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('mode') === 'local' ? defaultPanels : embedPanels
  }, [])

  useKeyboardNavigation()

  useEffect(() => {
    setPanels(panels)
  }, [setPanels, panels])

  const toggleHelp = useCallback(() => setHelpOpen((v) => !v), [])
  const toggleMinimap = useCallback(() => setMinimapOpen((v) => !v), [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === '?') {
        e.preventDefault()
        toggleHelp()
      }
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault()
        toggleMinimap()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toggleHelp, toggleMinimap])

  const dpr: [number, number] = isMobile ? [1, 1] : [1, 1.5]
  const antialias = !isMobile
  const powerPreference = isMobile ? 'low-power' as const : 'default' as const

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100dvh',
        background: '#0a0a1a',
      }}
    >
      <CanvasErrorBoundary>
        <Suspense fallback={<LoadingScreen />}>
          <Canvas
            camera={{ position: [0, 0, 0], fov: 60, near: 0.1, far: 200 }}
            gl={{ antialias, alpha: false, powerPreference }}
            dpr={dpr}
            style={{ background: '#0a0a1a' }}
          >
            <XR store={xrStore}>
              <DashboardScene />
            </XR>
          </Canvas>
        </Suspense>
      </CanvasErrorBoundary>

      {/* Offscreen chart renderer — captures charts as textures for VR */}
      <OffscreenChartRenderer panels={panels} active={isInXR} />

      <Navbar onHelpClick={toggleHelp} onMinimapClick={toggleMinimap} vrButton={<VRButton />} />
      <div
        data-ui-chrome
        style={{
          position: 'absolute',
          bottom: 'env(safe-area-inset-bottom, 0px)',
          left: 0,
          width: `${100 / uiScale}%`,
          display: 'flex',
          alignItems: 'center',
          padding: '8px 20px',
          background: 'rgba(10, 10, 26, 0.85)',
          backdropFilter: 'blur(12px)',
          borderTop: '1px solid rgba(60, 80, 120, 0.2)',
          zIndex: 10000,
          transform: `scale(${uiScale})`,
          transformOrigin: 'bottom left',
        }}
      >
        <Breadcrumbs isMobile={isMobile} />
        <NavigationHelper />
        <div style={{ marginLeft: 'auto' }}>
          <NavigationHelper compact />
        </div>
      </div>
      <AxisIndicators />
      <HelpPopup open={helpOpen} onClose={() => setHelpOpen(false)} />
      <Minimap open={minimapOpen} onClose={() => setMinimapOpen(false)} />
    </div>
  )
}
