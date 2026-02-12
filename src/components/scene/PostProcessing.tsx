import { useState, useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import {
  EffectComposer,
  Bloom,
  Vignette,
} from '@react-three/postprocessing'
import { useXRSession } from '../../xr/useXRSession.ts'

export function PostProcessing() {
  const { isInXR } = useXRSession()
  const gl = useThree((s) => s.gl)

  // Track WebGL context loss — EffectComposer crashes if the context is null
  const [contextLost, setContextLost] = useState(false)
  useEffect(() => {
    const canvas = gl.domElement
    const onLost = () => setContextLost(true)
    const onRestored = () => setContextLost(false)
    canvas.addEventListener('webglcontextlost', onLost)
    canvas.addEventListener('webglcontextrestored', onRestored)
    return () => {
      canvas.removeEventListener('webglcontextlost', onLost)
      canvas.removeEventListener('webglcontextrestored', onRestored)
    }
  }, [gl])

  // Delay mounting post-processing to give the scene time to stabilize
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 1000)
    return () => clearTimeout(timer)
  }, [])

  // EffectComposer conflicts with XR multiview rendering — disable in VR.
  // Also skip when the WebGL context is lost (happens during XR session
  // transitions and with the WebXR emulator, which exhausts WebGL contexts).
  if (!ready || isInXR || contextLost) return null

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
