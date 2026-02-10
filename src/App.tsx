import { Suspense, useCallback, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { DashboardScene } from './components/scene/DashboardScene.tsx'
import { Navbar } from './components/ui/Navbar.tsx'
import { Breadcrumbs } from './components/ui/Breadcrumbs.tsx'
import { LoadingScreen } from './components/ui/LoadingScreen.tsx'
import { useDashboardStore } from './store/dashboardStore.ts'
import { defaultPanels } from './data/mockData.ts'
import { useKeyboardNavigation } from './hooks/useKeyboardNavigation.ts'
import { AxisIndicators } from './components/ui/AxisIndicators.tsx'
import { NavigationHelper } from './components/ui/NavigationHelper.tsx'
import { HelpPopup } from './components/ui/HelpPopup.tsx'
import { useViewport } from './hooks/useViewport.ts'

export default function App() {
  const setPanels = useDashboardStore((s) => s.setPanels)
  const [helpOpen, setHelpOpen] = useState(false)
  const { isMobile, uiScale } = useViewport()

  useKeyboardNavigation()

  useEffect(() => {
    setPanels(defaultPanels)
  }, [setPanels])

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
        height: '100vh',
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
          bottom: 0,
          left: 0,
          width: `${100 / uiScale}%`,
          display: 'flex',
          alignItems: 'center',
          padding: '8px 20px',
          background: 'rgba(10, 10, 26, 0.6)',
          backdropFilter: 'blur(12px)',
          borderTop: '1px solid rgba(60, 80, 120, 0.2)',
          zIndex: 10000,
          transform: `scale(${uiScale})`,
          transformOrigin: 'bottom left',
        }}
      >
        <Breadcrumbs isMobile={isMobile} />
        {!isMobile && <NavigationHelper />}
      </div>
      <AxisIndicators />
      <HelpPopup open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  )
}
