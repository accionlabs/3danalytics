import { Suspense, useEffect, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import { DashboardScene } from './components/scene/DashboardScene.tsx'
import { Navbar } from './components/ui/Navbar.tsx'
import { Breadcrumbs } from './components/ui/Breadcrumbs.tsx'
import { LoadingScreen } from './components/ui/LoadingScreen.tsx'
import { useDashboardStore } from './store/dashboardStore.ts'
import { defaultPanels } from './data/mockData.ts'

export default function App() {
  const setPanels = useDashboardStore((s) => s.setPanels)
  const focusedPanelId = useDashboardStore((s) => s.focusedPanelId)
  const isDragging = useDashboardStore((s) => s.isDragging)
  const unfocus = useDashboardStore((s) => s.unfocus)

  useEffect(() => {
    setPanels(defaultPanels)
  }, [setPanels])

  // Fires when a click misses all 3D meshes — skip if user was panning
  const handlePointerMissed = useCallback(() => {
    if (focusedPanelId && !isDragging) {
      unfocus()
    }
  }, [focusedPanelId, isDragging, unfocus])

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
          onPointerMissed={handlePointerMissed}
        >
          <DashboardScene />
        </Canvas>
      </Suspense>

      <Navbar />
      <Breadcrumbs />
    </div>
  )
}
