import { useRef, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
  useXRInputSourceState,
  useXRControllerButtonEvent,
} from '@react-three/xr'
import * as THREE from 'three'
import { useDashboardStore } from '../store/dashboardStore.ts'
import { findNeighbor } from './useKeyboardNavigation.ts'
import { vrLocomotion } from '../components/xr/XRTeleport.tsx'

/** Smooth locomotion speed in meters/second */
const MOVE_SPEED = 3.0
/** Snap turn angle in radians (30°) */
const SNAP_ANGLE = Math.PI / 6
/** Snap turn cooldown in ms */
const SNAP_COOLDOWN = 300
/** Thumbstick dead zone for smooth movement */
const MOVE_DEAD_ZONE = 0.15
/** Thumbstick dead zone for discrete navigation */
const NAV_DEAD_ZONE = 0.5
/** Cooldown between discrete axis navigations in ms */
const NAV_COOLDOWN_MS = 400

/**
 * VR controller input — combines smooth locomotion with discrete panel navigation.
 *
 * Controller mapping:
 * - Left thumbstick: smooth locomotion (forward/back/strafe relative to head direction)
 * - Right thumbstick left/right: snap turn (30° increments)
 * - Right thumbstick up/down: drill deeper (forward) / drill out (back)
 * - Either squeeze: navigate back
 */
export function useVRNavigation() {
  const leftController = useXRInputSourceState('controller', 'left')
  const rightController = useXRInputSourceState('controller', 'right')
  const { camera } = useThree()

  const lastNavTime = useRef(0)
  const lastSnapTime = useRef(0)

  // Temp vectors to avoid allocation
  const _forward = useRef(new THREE.Vector3())
  const _right = useRef(new THREE.Vector3())

  const navigateAxis = useCallback((axis: 'x' | 'y' | 'z', direction: 1 | -1) => {
    const now = Date.now()
    if (now - lastNavTime.current < NAV_COOLDOWN_MS) return
    lastNavTime.current = now

    const state = useDashboardStore.getState()
    const current = state.panels.find((p) => p.id === state.focusedPanelId)
    if (!current) return

    if (axis === 'z' && direction === -1) {
      state.navigateBack()
      return
    }

    const neighbor = findNeighbor(state.panels, current, axis, direction)
    if (neighbor) {
      state.navigateTo(neighbor.id, axis)
      // Reset locomotion offset on panel teleport so user starts fresh at new panel
      vrLocomotion.offset.set(0, 0, 0)
      vrLocomotion.yaw = 0
    }
  }, [])

  // Squeeze (grip) on either controller → navigate back
  useXRControllerButtonEvent(
    leftController,
    'xr-standard-squeeze',
    (state) => {
      if (state === 'pressed') {
        useDashboardStore.getState().navigateBack()
        vrLocomotion.offset.set(0, 0, 0)
        vrLocomotion.yaw = 0
      }
    },
  )
  useXRControllerButtonEvent(
    rightController,
    'xr-standard-squeeze',
    (state) => {
      if (state === 'pressed') {
        useDashboardStore.getState().navigateBack()
        vrLocomotion.offset.set(0, 0, 0)
        vrLocomotion.yaw = 0
      }
    },
  )

  useFrame((_state, delta) => {
    // ── Left thumbstick: smooth locomotion ──
    if (leftController) {
      const thumbstick = leftController.gamepad?.['xr-standard-thumbstick']
      if (thumbstick) {
        const x = thumbstick.xAxis ?? 0
        const y = thumbstick.yAxis ?? 0

        if (Math.abs(x) > MOVE_DEAD_ZONE || Math.abs(y) > MOVE_DEAD_ZONE) {
          // Get camera's forward direction projected onto XZ plane
          camera.getWorldDirection(_forward.current)
          _forward.current.y = 0
          _forward.current.normalize()

          // Right vector
          _right.current.crossVectors(_forward.current, new THREE.Vector3(0, 1, 0)).normalize()

          // Accumulate locomotion offset (world moves opposite)
          const moveX = x * MOVE_SPEED * delta
          const moveZ = y * MOVE_SPEED * delta  // thumbstick Y: forward is negative
          vrLocomotion.offset.addScaledVector(_right.current, -moveX)
          vrLocomotion.offset.addScaledVector(_forward.current, moveZ)
        }
      }
    }

    // ── Right thumbstick ──
    if (rightController) {
      const thumbstick = rightController.gamepad?.['xr-standard-thumbstick']
      if (thumbstick) {
        const x = thumbstick.xAxis ?? 0
        const y = thumbstick.yAxis ?? 0

        // Left/right: snap turn
        const now = Date.now()
        if (Math.abs(x) > 0.6 && now - lastSnapTime.current > SNAP_COOLDOWN) {
          lastSnapTime.current = now
          vrLocomotion.yaw += x > 0 ? -SNAP_ANGLE : SNAP_ANGLE
        }

        // Up/down: drill in/out (discrete panel navigation)
        if (Math.abs(y) > NAV_DEAD_ZONE && Math.abs(y) > Math.abs(x)) {
          // Push forward (−Y) = drill deeper (z+1), pull back (+Y) = drill out (z−1)
          navigateAxis('z', y < 0 ? 1 : -1)
        }
      }
    }
  })
}
