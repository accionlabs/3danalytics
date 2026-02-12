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
  const vrOrigin = useRef(new THREE.Vector3(0, 1.6, 6)) // Start position (eye height)
  const rotationY = useRef(0) // Y-axis rotation for snap turning

  const panels = useDashboardStore((s) => s.panels)
  const focusedPanelId = useDashboardStore((s) => s.focusedPanelId)

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

      // Forward/backward movement
      if (Math.abs(yAxis) > MOVE_THRESHOLD) {
        const direction = new THREE.Vector3(0, 0, -1)
        direction.applyEuler(new THREE.Euler(0, rotationY.current, 0))
        vrOrigin.current.addScaledVector(direction, yAxis * MOVE_SPEED)
      }

      // Left/right turning (snap rotation)
      if (Math.abs(xAxis) > MOVE_THRESHOLD) {
        rotationY.current += xAxis * TURN_SPEED
      }

      // Apply origin transform to camera's parent (XR rig)
      if (camera.parent) {
        camera.parent.position.copy(vrOrigin.current)
        camera.parent.rotation.y = rotationY.current
        camera.parent.updateMatrixWorld()
      }
    }, 16) // ~60fps

    return () => clearInterval(moveInterval)
  }, [session, rightInputSource, camera])

  // Teleport to focused panel with A button
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

        // Teleport to focused panel
        if (focusedPanelId) {
          const focusedPanel = panels.find((p) => p.id === focusedPanelId)
          if (focusedPanel) {
            // Position camera 3 units in front of the focused panel
            const positions = grammarLayout(panels)
            const panelIndex = panels.findIndex((p) => p.id === focusedPanelId)

            if (panelIndex >= 0 && positions[panelIndex]) {
              const panelPos = positions[panelIndex].position
              vrOrigin.current.set(panelPos[0], panelPos[1] + 1.6, panelPos[2] + 3)

              // Face the panel
              const lookDir = new THREE.Vector3(panelPos[0], panelPos[1], panelPos[2])
              lookDir.sub(vrOrigin.current).normalize()
              rotationY.current = Math.atan2(lookDir.x, lookDir.z)

              if (camera.parent) {
                camera.parent.position.copy(vrOrigin.current)
                camera.parent.rotation.y = rotationY.current
                camera.parent.updateMatrixWorld()
              }
            }
          }
        }
      }
    }, 100)

    return () => clearInterval(checkTeleport)
  }, [session, leftInputSource, rightInputSource, focusedPanelId, panels, camera])

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

      if (Math.abs(xAxis) > STRAFE_THRESHOLD) {
        const direction = new THREE.Vector3(1, 0, 0)
        direction.applyEuler(new THREE.Euler(0, rotationY.current, 0))
        vrOrigin.current.addScaledVector(direction, xAxis * STRAFE_SPEED)

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
