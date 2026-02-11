import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
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
import { useViewport } from './hooks/useViewport.ts'

export default function App() {
  const setPanels = useDashboardStore((s) => s.setPanels)
  const [helpOpen, setHelpOpen] = useState(false)
  const { isMobile, uiScale } = useViewport()

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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === '?') {
        e.preventDefault()
        toggleHelp()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toggleHelp])

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
      <Suspense fallback={<LoadingScreen />}>
        <Canvas
          camera={{ position: [0, 0, 0], fov: 60, near: 0.1, far: 200 }}
          gl={{ antialias, alpha: false, powerPreference }}
          dpr={dpr}
          style={{ background: '#0a0a1a' }}
        >
          <DashboardScene />
        </Canvas>
      </Suspense>

      <Navbar onHelpClick={toggleHelp} />
      <div
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
        {isMobile ? (
          <div style={{ marginLeft: 'auto' }}>
            <NavigationHelper compact />
          </div>
        ) : (
          <NavigationHelper />
        )}
      </div>
      <AxisIndicators />
      <HelpPopup open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  )
}
