import { useXRInputSourceState } from '@react-three/xr'
import { Line } from '@react-three/drei'
import { useEffect } from 'react'

/**
 * VR Controllers component that renders visible laser pointers for interaction.
 * Enables pointing at and clicking on panels in VR.
 */
export function VRControllers() {
  const leftController = useXRInputSourceState('controller', 'left')
  const rightController = useXRInputSourceState('controller', 'right')

  useEffect(() => {
    if (leftController || rightController) {
      console.log('[VR] Controllers detected and ready for interaction')
    }
  }, [leftController, rightController])

  return (
    <>
      {/* Left controller ray */}
      {leftController && (
        <group position={[0, 0, 0]}>
          <Line
            points={[
              [0, 0, 0],
              [0, 0, -10], // 10 meters forward
            ]}
            color="#4a90e2"
            lineWidth={3}
            opacity={0.8}
            transparent
          />
          {/* Ray endpoint indicator */}
          <mesh position={[0, 0, -10]}>
            <sphereGeometry args={[0.05, 16, 16]} />
            <meshBasicMaterial color="#4a90e2" transparent opacity={0.8} />
          </mesh>
        </group>
      )}

      {/* Right controller ray */}
      {rightController && (
        <group position={[0, 0, 0]}>
          <Line
            points={[
              [0, 0, 0],
              [0, 0, -10], // 10 meters forward
            ]}
            color="#e24a90"
            lineWidth={3}
            opacity={0.8}
            transparent
          />
          {/* Ray endpoint indicator */}
          <mesh position={[0, 0, -10]}>
            <sphereGeometry args={[0.05, 16, 16]} />
            <meshBasicMaterial color="#e24a90" transparent opacity={0.8} />
          </mesh>
        </group>
      )}
    </>
  )
}
