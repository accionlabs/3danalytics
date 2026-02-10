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

export default function App() {
  const setPanels = useDashboardStore((s) => s.setPanels)
  const [helpOpen, setHelpOpen] = useState(false)

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
          gl={{ antialias: true, alpha: false, powerPreference: 'default' }}
          dpr={[1, 1.5]}
          style={{ background: '#0a0a1a' }}
        >
          <DashboardScene />
        </Canvas>
      </Suspense>

      <Navbar onHelpClick={toggleHelp} />
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
      <HelpPopup open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  )
}
