import { useState, useEffect } from 'react'
import {
  EffectComposer,
  Bloom,
  Vignette,
} from '@react-three/postprocessing'

export function PostProcessing() {
  // Delay mounting post-processing to give the scene time to stabilize
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 1000)
    return () => clearTimeout(timer)
  }, [])

  if (!ready) return null

  return (
    <EffectComposer multisampling={0}>
      <Bloom
        luminanceThreshold={0.6}
        luminanceSmoothing={0.3}
        intensity={0.4}
        mipmapBlur
      />
      <Vignette eskil={false} offset={0.1} darkness={0.5} />
    </EffectComposer>
  )
}
