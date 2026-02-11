import { useEffect, useRef } from 'react'
import { useXRInputSourceState } from '@react-three/xr'
import { useDashboardStore } from '../../store/dashboardStore.ts'
import { findNeighbor } from '../../hooks/useKeyboardNavigation.ts'
import type { PanelConfig } from '../../types/index.ts'

/**
 * VR controller input handler that maps VR controller inputs to dashboard navigation.
 *
 * Controller mapping:
 * - Left thumbstick X-axis: Navigate along X (process steps)
 * - Left thumbstick Y-axis: Navigate along Y (segments)
 * - Right thumbstick X-axis: Camera pan (horizontal)
 * - Right thumbstick Y-axis: Camera pan (vertical) / Navigate Z (drill in/out)
 * - Trigger (squeeze): Focus/drill into panel (when pointing at panel)
 * - Grip: Navigate back to parent
 * - A/X button: Navigate home
 */
export function VRControllerInput() {
  const leftInputSource = useXRInputSourceState('controller', 'left')
  const rightInputSource = useXRInputSourceState('controller', 'right')

  const lastNavTime = useRef({ x: 0, y: 0, z: 0 })
  const NAV_COOLDOWN = 400 // ms - prevent rapid repeated navigation

  const navigateAxis = (axis: 'x' | 'y' | 'z', direction: 1 | -1) => {
    const now = Date.now()
    if (now - lastNavTime.current[axis] < NAV_COOLDOWN) return
    lastNavTime.current[axis] = now

    const { focusedPanelId, panels: currentPanels } = useDashboardStore.getState()
    const current = currentPanels.find((p: PanelConfig) => p.id === focusedPanelId)
    if (!current) return

    const neighbor = findNeighbor(currentPanels, current, axis, direction)
    if (neighbor) {
      useDashboardStore.getState().navigateTo(neighbor.id, axis)
    }
  }

  // Left controller: Navigation along X and Y axes with thumbstick
  useEffect(() => {
    if (!leftInputSource?.gamepad) return

    const checkThumbstick = () => {
      const gamepad = leftInputSource.gamepad as any
      if (!gamepad?.axes) return

      const axes = Object.values(gamepad.axes)
      const xAxis = axes[0] as number
      const yAxis = axes[1] as number
      const THRESHOLD = 0.5 // Dead zone threshold

      // X-axis navigation (left/right)
      if (Math.abs(xAxis) > THRESHOLD) {
        navigateAxis('x', xAxis > 0 ? 1 : -1)
      }

      // Y-axis navigation (up/down)
      if (Math.abs(yAxis) > THRESHOLD) {
        // Y-axis is inverted on most controllers
        navigateAxis('y', yAxis > 0 ? -1 : 1)
      }
    }

    const intervalId = setInterval(checkThumbstick, 100)
    return () => clearInterval(intervalId)
  }, [leftInputSource])

  // Right controller: Z-axis navigation (drill in/out) with thumbstick Y
  useEffect(() => {
    if (!rightInputSource?.gamepad) return

    const checkThumbstick = () => {
      const gamepad = rightInputSource.gamepad as any
      if (!gamepad?.axes) return

      const axes = Object.values(gamepad.axes)
      const yAxis = axes[1] as number
      const THRESHOLD = 0.6 // Higher threshold for Z-axis

      if (Math.abs(yAxis) > THRESHOLD) {
        navigateAxis('z', yAxis > 0 ? 1 : -1)
      }
    }

    const intervalId = setInterval(checkThumbstick, 100)
    return () => clearInterval(intervalId)
  }, [rightInputSource])

  // Grip button: Navigate back
  useEffect(() => {
    if (!leftInputSource?.gamepad && !rightInputSource?.gamepad) return

    const checkButtons = () => {
      const leftGamepad = leftInputSource?.gamepad as any
      const rightGamepad = rightInputSource?.gamepad as any

      // Check grip button (usually index 1)
      const leftButtons = leftGamepad?.buttons ? Object.values(leftGamepad.buttons) : []
      const rightButtons = rightGamepad?.buttons ? Object.values(rightGamepad.buttons) : []

      const leftGrip = leftButtons[1] as any
      const rightGrip = rightButtons[1] as any

      if (leftGrip?.pressed || rightGrip?.pressed) {
        const now = Date.now()
        if (now - lastNavTime.current.z < NAV_COOLDOWN) return
        lastNavTime.current.z = now

        useDashboardStore.getState().navigateBack()
      }

      // Check A/X button (usually index 4 or 5) for home navigation
      const aButton = (leftButtons[4] as any) || (rightButtons[4] as any)
      const xButton = (leftButtons[5] as any) || (rightButtons[5] as any)

      if (aButton?.pressed || xButton?.pressed) {
        const now = Date.now()
        if (now - lastNavTime.current.z < NAV_COOLDOWN * 2) return
        lastNavTime.current.z = now

        useDashboardStore.getState().navigateHome()
      }
    }

    const intervalId = setInterval(checkButtons, 100)
    return () => clearInterval(intervalId)
  }, [leftInputSource, rightInputSource])

  return null
}
