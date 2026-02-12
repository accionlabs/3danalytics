import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { useXR, useXRInputSourceState } from '@react-three/xr'
import * as THREE from 'three'
import { useDashboardStore } from '../../store/dashboardStore.ts'
import { grammarLayout } from '../../layouts/grammarLayout.ts'

/**
 * VR Locomotion - allows user to move around the 3D space using VR controllers.
 *
 * Controls:
 * - Right thumbstick forward/back: Move forward/backward in view direction
 * - Right thumbstick left/right: Rotate view left/right
 * - Left thumbstick horizontal: Strafe left/right
 * - A button: Teleport to focused panel
 */
export function VRLocomotion() {
  const { session } = useXR()
  const { camera } = useThree()
  const rightInputSource = useXRInputSourceState('controller', 'right')
  const leftInputSource = useXRInputSourceState('controller', 'left')

  const lastTeleportTime = useRef(0)
  // Start position: at overview camera position facing the panels
  // Panels are at Z=-8 and beyond, so we start at Z=6 facing -Z direction (rotation = PI)
  const vrOrigin = useRef(new THREE.Vector3(0, 1.6, 6))
  const targetOrigin = useRef(new THREE.Vector3(0, 1.6, 6))
  const rotationY = useRef(Math.PI) // Face toward panels (rotate 180°)
  const prevFocusedId = useRef<string | null>(null)

  const panels = useDashboardStore((s) => s.panels)
  const focusedPanelId = useDashboardStore((s) => s.focusedPanelId)

  // Initialize VR camera position and rotation on session start
  useEffect(() => {
    if (!session || !camera.parent) return

    // Set initial position and rotation
    camera.parent.position.copy(vrOrigin.current)
    camera.parent.rotation.y = rotationY.current
    camera.parent.updateMatrixWorld()
  }, [session, camera])

  // Smooth camera transitions when focused panel changes (Z-axis navigation)
  useEffect(() => {
    if (!session) return

    if (!focusedPanelId) {
      // Return to overview position when unfocusing (see Z=0 panels)
      if (prevFocusedId.current !== null) {
        console.log('[VRLocomotion] Returning to overview position (Z=6 to see Z=0 panels)')
        targetOrigin.current.set(0, 1.6, 6)
        prevFocusedId.current = null
      }
      return
    }

    // Only animate on focus changes
    if (prevFocusedId.current === focusedPanelId) {
      console.log('[VRLocomotion] Same panel focused, skipping animation')
      return
    }

    console.log('[VRLocomotion] Focus changed from', prevFocusedId.current, 'to', focusedPanelId)
    prevFocusedId.current = focusedPanelId

    const focusedPanel = panels.find(p => p.id === focusedPanelId)
    if (!focusedPanel) {
      console.log('[VRLocomotion] Panel not found:', focusedPanelId)
      return
    }

    const positions = grammarLayout(panels)
    const panelIndex = panels.findIndex(p => p.id === focusedPanelId)
    if (panelIndex < 0) return

    const panelPos = positions[panelIndex].position
    const detailLevel = focusedPanel.semantic.detailLevel

    // Calculate optimal camera position based on Z-axis depth
    // CRITICAL: When you focus a panel, you want to see its CHILDREN clearly in front
    // So camera position is based on the NEXT detail level (children's level)
    //
    // Panel Z positions: Z=0 at -8, Z=1 at -12, Z=2 at -16, Z=3 at -20
    // Camera positions to see children:
    // - Focus Z=0 → see Z=1 children at -12 → camera at -6 (6 units in front of children)
    // - Focus Z=1 → see Z=2 children at -16 → camera at -10
    // - Focus Z=2 → see Z=3 children at -20 → camera at -14
    // - Focus Z=3 → deepest level, stay close → camera at -17

    let cameraZ: number
    let cameraY = 1.6 // Eye height

    switch (detailLevel) {
      case 0: // Clicked Z=0 → move forward to see Z=1 children
        cameraZ = -6 // Z=1 panels at -12, camera at -6 = 6 units in front
        break
      case 1: // Clicked Z=1 → move forward to see Z=2 children
        cameraZ = -10 // Z=2 panels at -16, camera at -10 = 6 units in front
        break
      case 2: // Clicked Z=2 → move forward to see Z=3 children
        cameraZ = -14 // Z=3 panels at -20, camera at -14 = 6 units in front
        break
      case 3: // Clicked Z=3 → deepest level, move very close
        cameraZ = -17 // Z=3 panels at -20, camera at -17 = 3 units in front
        break
      default:
        cameraZ = -6
    }

    // Match panel's X and Y position for centered view
    const newTargetPos = new THREE.Vector3(panelPos[0], cameraY, cameraZ)
    targetOrigin.current.copy(newTargetPos)

    const distance = vrOrigin.current.distanceTo(targetOrigin.current)
    console.log('[VRLocomotion] 🚀 MOVING CAMERA:', {
      detailLevel,
      from: vrOrigin.current.toArray(),
      to: targetOrigin.current.toArray(),
      distance: distance.toFixed(2),
      panelZ: panelPos[2].toFixed(2),
      cameraZ: cameraZ.toFixed(2),
      rotation: `${rotationY.current.toFixed(2)} rad (${(rotationY.current * 180 / Math.PI).toFixed(0)}°)`,
      facing: 'FORWARD (-Z direction, toward children)',
    })

    // Rotate to face FORWARD toward the children, not backward toward the parent
    // We always want to look in the -Z direction (forward) where the children are
    // Camera is at cameraZ, children are at more negative Z (further away)
    rotationY.current = Math.PI // Face forward (-Z direction)

    // Align X with the focused panel's X position
    // (We already set camera X to panelPos[0] above)

  }, [session, focusedPanelId, panels])

  // Smooth interpolation to target position (runs every frame)
  useEffect(() => {
    if (!session) return

    let frameCount = 0
    const interpolateInterval = setInterval(() => {
      const lerpFactor = 0.25 // Very fast for debugging - will tune down once working

      // Check if we need to move
      const distance = vrOrigin.current.distanceTo(targetOrigin.current)

      // Log every 60 frames (~1 second)
      if (frameCount % 60 === 0 && distance > 0.01) {
        console.log('[VRLocomotion] Interpolating - distance:', distance.toFixed(2), 'current:', vrOrigin.current.toArray(), 'target:', targetOrigin.current.toArray())
      }
      frameCount++

      // Lerp position
      vrOrigin.current.lerp(targetOrigin.current, lerpFactor)

      // Apply to camera
      if (camera.parent) {
        camera.parent.position.copy(vrOrigin.current)
        camera.parent.rotation.y = rotationY.current
        camera.parent.updateMatrixWorld()
      } else if (frameCount % 60 === 0) {
        console.warn('[VRLocomotion] camera.parent is null!')
      }
    }, 16) // ~60fps

    return () => clearInterval(interpolateInterval)
  }, [session, camera])

  // Smooth locomotion with right thumbstick
  useEffect(() => {
    if (!session || !rightInputSource?.gamepad) return

    const moveInterval = setInterval(() => {
      const gamepad = rightInputSource.gamepad as any
      if (!gamepad?.axes) return

      const axes = Object.values(gamepad.axes) as number[]
      const xAxis = axes[2] || 0 // Right stick horizontal
      const yAxis = axes[3] || 0 // Right stick vertical

      const MOVE_THRESHOLD = 0.3
      const MOVE_SPEED = 0.05
      const TURN_SPEED = 0.02

      // Manual movement overrides auto-positioning
      if (Math.abs(yAxis) > MOVE_THRESHOLD || Math.abs(xAxis) > MOVE_THRESHOLD) {
        // Update both current and target to prevent snapping back

        // Forward/backward movement
        if (Math.abs(yAxis) > MOVE_THRESHOLD) {
          const direction = new THREE.Vector3(0, 0, -1)
          direction.applyEuler(new THREE.Euler(0, rotationY.current, 0))
          const movement = direction.multiplyScalar(yAxis * MOVE_SPEED)
          vrOrigin.current.add(movement)
          targetOrigin.current.add(movement)
        }

        // Left/right turning
        if (Math.abs(xAxis) > MOVE_THRESHOLD) {
          rotationY.current += xAxis * TURN_SPEED
        }

        // Apply origin transform to camera's parent (XR rig)
        if (camera.parent) {
          camera.parent.position.copy(vrOrigin.current)
          camera.parent.rotation.y = rotationY.current
          camera.parent.updateMatrixWorld()
        }
      }
    }, 16) // ~60fps

    return () => clearInterval(moveInterval)
  }, [session, rightInputSource, camera])

  // A button - instant jump to target position (skip smooth transition)
  useEffect(() => {
    if (!session || (!leftInputSource?.gamepad && !rightInputSource?.gamepad)) return

    const checkTeleport = setInterval(() => {
      const leftGamepad = leftInputSource?.gamepad as any
      const rightGamepad = rightInputSource?.gamepad as any

      const leftButtons = leftGamepad?.buttons ? Object.values(leftGamepad.buttons) : []
      const rightButtons = rightGamepad?.buttons ? Object.values(rightGamepad.buttons) : []

      // A button (usually index 4)
      const aButton = (leftButtons[4] as any) || (rightButtons[4] as any)

      if (aButton?.pressed) {
        const now = Date.now()
        if (now - lastTeleportTime.current < 500) return // Cooldown
        lastTeleportTime.current = now

        // Instantly jump to the current target (no smooth transition)
        vrOrigin.current.copy(targetOrigin.current)

        if (camera.parent) {
          camera.parent.position.copy(vrOrigin.current)
          camera.parent.rotation.y = rotationY.current
          camera.parent.updateMatrixWorld()
        }
      }
    }, 100)

    return () => clearInterval(checkTeleport)
  }, [session, leftInputSource, rightInputSource, camera])

  // Strafing with left thumbstick horizontal
  useEffect(() => {
    if (!session || !leftInputSource?.gamepad) return

    const strafeInterval = setInterval(() => {
      const gamepad = leftInputSource.gamepad as any
      if (!gamepad?.axes) return

      const axes = Object.values(gamepad.axes) as number[]
      const xAxis = axes[0] || 0 // Left stick horizontal

      const STRAFE_THRESHOLD = 0.3
      const STRAFE_SPEED = 0.05

      // Manual strafing overrides auto-positioning
      if (Math.abs(xAxis) > STRAFE_THRESHOLD) {
        const direction = new THREE.Vector3(1, 0, 0)
        direction.applyEuler(new THREE.Euler(0, rotationY.current, 0))
        const movement = direction.multiplyScalar(xAxis * STRAFE_SPEED)
        vrOrigin.current.add(movement)
        targetOrigin.current.add(movement)

        if (camera.parent) {
          camera.parent.position.copy(vrOrigin.current)
          camera.parent.updateMatrixWorld()
        }
      }
    }, 16)

    return () => clearInterval(strafeInterval)
  }, [session, leftInputSource, camera])

  return null
}
