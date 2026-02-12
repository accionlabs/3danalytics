import { useRef, useState, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import {
  XR, createXRStore, XROrigin,
  useXRInputSourceState,
} from '@react-three/xr'
import * as THREE from 'three'

// ── XR Store (module-level singleton, same pattern as main app) ──
const xrStore = createXRStore()

// ═══════════════════════════════════════════════════════════════════
//  SCENE CONTENT — spread across a large area to navigate through
// ═══════════════════════════════════════════════════════════════════

/** A labeled station: colored pillar + floating text */
function Station({ position, color, label }: {
  position: [number, number, number]
  color: string
  label: string
}) {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((_s, dt) => {
    if (meshRef.current) meshRef.current.rotation.y += dt * 0.3
  })

  return (
    <group position={position}>
      {/* Pillar */}
      <mesh ref={meshRef} position={[0, 0.75, 0]}>
        <boxGeometry args={[0.6, 1.5, 0.6]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Floating label */}
      <Text
        position={[0, 2, 0]}
        fontSize={0.2}
        color="white"
        anchorX="center"
        anchorY="bottom"
        outlineWidth={0.02}
        outlineColor="black"
      >
        {label}
      </Text>
      {/* Ground marker */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[0.8, 32]} />
        <meshStandardMaterial color={color} transparent opacity={0.3} />
      </mesh>
    </group>
  )
}

/** All scene objects — these go inside the world-offset group */
function WorldContent() {
  return (
    <>
      {/* Stations spread in a grid pattern */}
      <Station position={[0, 0, -3]} color="#ef4444" label="A: Origin Front" />
      <Station position={[-4, 0, -3]} color="#f97316" label="B: Left" />
      <Station position={[4, 0, -3]} color="#eab308" label="C: Right" />
      <Station position={[0, 0, -8]} color="#22c55e" label="D: Far Center" />
      <Station position={[-4, 0, -8]} color="#06b6d4" label="E: Far Left" />
      <Station position={[4, 0, -8]} color="#8b5cf6" label="F: Far Right" />
      <Station position={[0, 0, -13]} color="#ec4899" label="G: Very Far" />
      <Station position={[-8, 0, -8]} color="#f43f5e" label="H: Way Left" />
      <Station position={[8, 0, -8]} color="#14b8a6" label="I: Way Right" />

      {/* Floor grid — large for locomotion */}
      <gridHelper args={[30, 30, '#444', '#222']} />

      {/* Axis helper at world origin */}
      <axesHelper args={[2]} />

      {/* Origin label on floor */}
      <Text
        position={[0, 0.02, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.25}
        color="#666"
        anchorX="center"
        anchorY="middle"
      >
        WORLD ORIGIN
      </Text>

      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <directionalLight position={[-5, 8, -10]} intensity={0.3} color="#88aaff" />
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════
//  VR LOCOMOTION — thumbstick smooth movement + snap turn
// ═══════════════════════════════════════════════════════════════════

/** Smooth locomotion speed in meters/second */
const MOVE_SPEED = 3.0
/** Snap turn angle in radians */
const SNAP_ANGLE = Math.PI / 6  // 30°
/** Snap turn cooldown in ms */
const SNAP_COOLDOWN = 300
/** Thumbstick dead zone */
const DEAD_ZONE = 0.15

function VRLocomotion({ worldRef }: { worldRef: React.RefObject<THREE.Group | null> }) {
  const leftController = useXRInputSourceState('controller', 'left')
  const rightController = useXRInputSourceState('controller', 'right')
  const { camera } = useThree()

  // World offset state (we move the world, user stays at origin)
  const worldOffset = useRef(new THREE.Vector3(0, 0, 0))
  const worldYaw = useRef(0)

  // Snap turn cooldown
  const lastSnapTime = useRef(0)

  // Temp vectors to avoid allocation
  const _forward = useRef(new THREE.Vector3())
  const _right = useRef(new THREE.Vector3())

  useFrame((_state, delta) => {
    if (!worldRef.current) return

    // ── Left thumbstick: smooth locomotion (forward/back/strafe) ──
    if (leftController) {
      const thumbstick = leftController.gamepad?.['xr-standard-thumbstick']
      if (thumbstick) {
        const x = thumbstick.xAxis ?? 0
        const y = thumbstick.yAxis ?? 0

        if (Math.abs(x) > DEAD_ZONE || Math.abs(y) > DEAD_ZONE) {
          // Get camera's forward direction projected onto XZ plane
          camera.getWorldDirection(_forward.current)
          _forward.current.y = 0
          _forward.current.normalize()

          // Right vector
          _right.current.crossVectors(_forward.current, new THREE.Vector3(0, 1, 0)).normalize()

          // Move the world OPPOSITE to desired movement direction
          // (moving world -X = user moves +X in world space)
          const moveX = x * MOVE_SPEED * delta
          const moveZ = y * MOVE_SPEED * delta  // thumbstick Y: forward is negative

          worldOffset.current.addScaledVector(_right.current, -moveX)
          worldOffset.current.addScaledVector(_forward.current, moveZ)
        }
      }
    }

    // ── Right thumbstick: snap turn (left/right) ──
    if (rightController) {
      const thumbstick = rightController.gamepad?.['xr-standard-thumbstick']
      if (thumbstick) {
        const x = thumbstick.xAxis ?? 0
        const now = Date.now()

        if (Math.abs(x) > 0.6 && now - lastSnapTime.current > SNAP_COOLDOWN) {
          lastSnapTime.current = now
          const angle = x > 0 ? -SNAP_ANGLE : SNAP_ANGLE
          worldYaw.current += angle
        }
      }
    }

    // Apply world offset + rotation
    worldRef.current.position.copy(worldOffset.current)
    worldRef.current.rotation.y = worldYaw.current
  })

  return null
}

// ═══════════════════════════════════════════════════════════════════
//  DEBUG HUD — head-locked text showing XR state + position
// ═══════════════════════════════════════════════════════════════════

function DebugHUD() {
  const textRef = useRef<{ text: string }>(undefined)
  const { gl, camera } = useThree()

  useFrame(() => {
    if (!textRef.current) return

    const xr = gl.xr
    const wp = new THREE.Vector3()
    camera.getWorldPosition(wp)

    const lines = [
      `xr.enabled: ${xr.enabled}  presenting: ${xr.isPresenting}`,
      `cam: ${camera.type}  parent: ${camera.parent?.type ?? '?'}`,
      `worldPos: [${wp.x.toFixed(1)}, ${wp.y.toFixed(1)}, ${wp.z.toFixed(1)}]`,
      '',
      'L-stick: move  R-stick: snap turn',
    ]
    textRef.current.text = lines.join('\n')
  })

  return (
    <Text
      ref={textRef as unknown as React.Ref<never>}
      position={[0, 2.8, -2]}
      fontSize={0.1}
      color="#00ff88"
      anchorX="center"
      anchorY="top"
      maxWidth={4}
    >
      Loading...
    </Text>
  )
}

// ═══════════════════════════════════════════════════════════════════
//  SESSION LOGGER
// ═══════════════════════════════════════════════════════════════════

function SessionLogger() {
  const { gl } = useThree()
  const loggedRef = useRef(false)

  useFrame(() => {
    if (gl.xr.isPresenting && !loggedRef.current) {
      loggedRef.current = true
      console.log('[VR-TEST] XR session STARTED')
      console.log('[VR-TEST] gl.xr.enabled:', gl.xr.enabled)
      console.log('[VR-TEST] referenceSpace:', gl.xr.getReferenceSpace())
      const session = gl.xr.getSession()
      if (session) {
        console.log('[VR-TEST] visibilityState:', session.visibilityState)
        session.addEventListener('end', () => {
          console.log('[VR-TEST] XR session ENDED')
          loggedRef.current = false
        })
      }
    }
  })

  return null
}

// ═══════════════════════════════════════════════════════════════════
//  MAIN SCENE — XROrigin at origin, world content in offset group
// ═══════════════════════════════════════════════════════════════════

function VRScene() {
  const worldRef = useRef<THREE.Group>(null)

  return (
    <>
      {/* User stands at origin — headset tracking applies here */}
      <XROrigin position={[0, 0, 0]} />

      {/* World-offset group: VRLocomotion moves this to simulate user movement */}
      <group ref={worldRef}>
        <WorldContent />
        <DebugHUD />
      </group>

      {/* VR controller locomotion */}
      <VRLocomotion worldRef={worldRef} />
      <SessionLogger />
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════
//  APP ROOT
// ═══════════════════════════════════════════════════════════════════

export function App() {
  const [vrStatus, setVrStatus] = useState('idle')

  const enterVR = useCallback(async () => {
    try {
      setVrStatus('requesting...')
      await xrStore.enterVR()
      setVrStatus('in VR')
    } catch (err) {
      console.error('[VR-TEST] enterVR failed:', err)
      setVrStatus(`error: ${err}`)
    }
  }, [])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        camera={{ position: [0, 1.6, 4], fov: 70 }}
        style={{ width: '100%', height: '100%' }}
      >
        <XR store={xrStore}>
          <VRScene />
        </XR>
      </Canvas>

      {/* DOM overlay */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          right: 16,
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          zIndex: 10,
        }}
      >
        <button
          onClick={enterVR}
          style={{
            padding: '12px 24px',
            fontSize: 18,
            fontWeight: 'bold',
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          Enter VR
        </button>
        <span style={{ fontSize: 14, opacity: 0.7 }}>
          Status: {vrStatus}
        </span>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          fontSize: 12,
          opacity: 0.5,
          lineHeight: 1.8,
        }}
      >
        VR Navigation Test<br />
        Left thumbstick: smooth locomotion (forward/back/strafe)<br />
        Right thumbstick: snap turn (30°)<br />
        9 colored stations spread across the scene
      </div>
    </div>
  )
}
