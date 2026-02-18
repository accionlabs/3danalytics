import { Component, Suspense, useCallback, useEffect, useState } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import { Canvas } from '@react-three/fiber'
import { XR } from '@react-three/xr'
import { DashboardScene } from './components/scene/DashboardScene.tsx'
import { Navbar } from './components/ui/Navbar.tsx'
import { Breadcrumbs } from './components/ui/Breadcrumbs.tsx'
import { LoadingScreen } from './components/ui/LoadingScreen.tsx'
import { useDashboardStore } from './store/dashboardStore.ts'
import { fetchAllChartSummaries, fetchChart } from './services/chartApi.ts'
import { loadDashboardFromApi } from './data/apiTransforms.ts'
import { useKeyboardNavigation } from './hooks/useKeyboardNavigation.ts'
import { AxisIndicators } from './components/ui/AxisIndicators.tsx'
import { NavigationHelper } from './components/ui/NavigationHelper.tsx'
import { HelpPopup } from './components/ui/HelpPopup.tsx'
import { Minimap } from './components/ui/Minimap.tsx'
import { useViewport } from './hooks/useViewport.ts'
import { xrStore } from './xr/xrStore.ts'
import { VRButton } from './components/xr/VRButton.tsx'
import { ChartGPUOffscreenRenderer } from './xr/ChartGPUOffscreenRenderer.tsx'

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
  const setCausalLinks = useDashboardStore((s) => s.setCausalLinks)
  const setLoading = useDashboardStore((s) => s.setLoading)
  const setError = useDashboardStore((s) => s.setError)
  const panels = useDashboardStore((s) => s.panels)
  const isLoading = useDashboardStore((s) => s.isLoading)
  const error = useDashboardStore((s) => s.error)
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

  // Load dashboard data from the Semantic Chart Engine API
  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const { panels: loaded, causalLinks } = await loadDashboardFromApi(
          fetchAllChartSummaries,
          fetchChart,
        )
        if (!cancelled) {
          setPanels(loaded)
          setCausalLinks(causalLinks)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [setPanels, setCausalLinks, setLoading, setError])

  useKeyboardNavigation()

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

  if (isLoading) return <LoadingScreen />

  if (error) {
    return (
      <div style={{
        width: '100vw', height: '100dvh', background: '#0a0a1a',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 12, color: '#e05555', fontSize: 14,
      }}>
        <span style={{ fontWeight: 600 }}>Failed to load dashboard</span>
        <span style={{ color: '#607090', maxWidth: 400, textAlign: 'center' }}>{error}</span>
        <span style={{ color: '#607090', fontSize: 12 }}>
          Make sure the Semantic Chart Engine is running at{' '}
          <code style={{ color: '#8898aa' }}>http://localhost:3000</code>
        </span>
      </div>
    )
  }

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

      {/* Offscreen chart renderer — captures charts as textures for VR via ChartGPU */}
      <ChartGPUOffscreenRenderer panels={panels} active={isInXR} />

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
