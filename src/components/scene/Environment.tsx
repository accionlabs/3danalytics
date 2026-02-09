import { Stars, Grid } from '@react-three/drei'

export function Environment() {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} color="#8090c0" />
      <directionalLight
        position={[5, 8, 3]}
        intensity={0.7}
        color="#c0d0ff"
      />
      <pointLight position={[-5, 3, 5]} intensity={0.3} color="#60a0ff" />

      {/* Background color */}
      <color attach="background" args={['#0a0a1a']} />

      {/* Stars background */}
      <Stars
        radius={80}
        depth={50}
        count={2000}
        factor={4}
        saturation={0.5}
        fade
        speed={0.3}
      />

      {/* Subtle grid floor */}
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
    </>
  )
}
