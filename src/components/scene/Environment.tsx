import { Stars, Grid } from '@react-three/drei'
import { useXRSession } from '../../xr/useXRSession.ts'

export function Environment() {
  const { isInXR } = useXRSession()

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} color="#8090c0" />
      <directionalLight
        position={[5, 8, 3]}
        intensity={0.7}
        color="#c0d0ff"
      />
      {/* Skip extra point light in VR — saves one lighting pass per fragment */}
      {!isInXR && <pointLight position={[-5, 3, 5]} intensity={0.3} color="#60a0ff" />}

      {/* Background color */}
      <color attach="background" args={['#0a0a1a']} />

      {/* Stars: fewer particles + no animation in VR to save GPU time */}
      <Stars
        radius={80}
        depth={50}
        count={isInXR ? 500 : 2000}
        factor={4}
        saturation={0.5}
        fade
        speed={isInXR ? 0 : 0.3}
      />

      {/* Grid uses a complex infinite-fade shader — skip in VR */}
      {!isInXR && (
        <Grid
          position={[0, -3, 0]}
          args={[40, 40]}
          cellSize={1}
          cellThickness={0.5}
          cellColor="#1a2040"
          sectionSize={5}
          sectionThickness={1}
          sectionColor="#2a3060"
          fadeDistance={25}
          fadeStrength={1}
          infiniteGrid
        />
      )}
    </>
  )
}
