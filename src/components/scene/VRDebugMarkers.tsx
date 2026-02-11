import { Text } from '@react-three/drei'
import { useEffect } from 'react'

/**
 * VERY OBVIOUS debug markers to verify VR scene is rendering correctly.
 * Shows large colored objects at key positions so user knows VR is working.
 */
export function VRDebugMarkers() {
  useEffect(() => {
    console.log('[VR DEBUG] VRDebugMarkers component mounted and rendering')
  }, [])

  return (
    <group>
      {/* HUGE center marker - impossible to miss */}
      <mesh position={[0, 0, -5]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="red" />
      </mesh>

      {/* Large left marker */}
      <mesh position={[-3, 0, -5]}>
        <boxGeometry args={[0.8, 0.8, 0.8]} />
        <meshBasicMaterial color="blue" />
      </mesh>

      {/* Large right marker */}
      <mesh position={[3, 0, -5]}>
        <boxGeometry args={[0.8, 0.8, 0.8]} />
        <meshBasicMaterial color="green" />
      </mesh>

      {/* Large top marker */}
      <mesh position={[0, 2, -5]}>
        <boxGeometry args={[0.8, 0.8, 0.8]} />
        <meshBasicMaterial color="yellow" />
      </mesh>

      {/* Large bottom marker */}
      <mesh position={[0, -2, -5]}>
        <boxGeometry args={[0.8, 0.8, 0.8]} />
        <meshBasicMaterial color="cyan" />
      </mesh>

      {/* MASSIVE text - super visible */}
      <Text
        position={[0, 0.5, -4.5]}
        fontSize={0.5}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="black"
      >
        VR DEBUG ACTIVE
      </Text>

      {/* Distance reference text */}
      <Text
        position={[0, -0.5, -4.5]}
        fontSize={0.3}
        color="#00ff00"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.01}
        outlineColor="black"
      >
        5 meters away
      </Text>
    </group>
  )
}
