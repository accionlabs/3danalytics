import { useRef, useEffect, useCallback } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useDashboardStore } from '../../store/dashboardStore.ts'
import { findNeighbor } from '../../hooks/useKeyboardNavigation.ts'
import { Z_SPACING } from '../../layouts/grammarLayout.ts'

/** Target fraction of usable viewport the focused panel should fill */
export const TARGET_FILL = 0.85
/** The fixed camera offset used by cameraForPanel in the store */
const BASE_OFFSET = 3
/** Reference desktop heights for chrome (before CSS scaling) */
const NAVBAR_REF_HEIGHT = 48
const BOTTOM_BAR_REF_HEIGHT = 36
/** Horizontal breathing room per side */
const CHROME_SIDE = 16
/** uiScale formula — must match useViewport.ts */
function computeUiScale(viewportWidth: number): number {
  return Math.min(1, Math.max(0.65, viewportWidth / 1200))
}
/** Max camera offset before nearer Z-layer panels occlude the focused panel.
 *  Must be < Z_SPACING so the camera stays behind the layer in front. */
const MAX_OFFSET = Z_SPACING - 0.5

/**
 * Compute the ideal camera distance so the focused panel fills ~85% of the
 * **usable** viewport (after subtracting Navbar and breadcrumb bar).
 * Returns the raw distance in world units (not divided by BASE_OFFSET).
 */
export function fitIdealDistance(
  panelWidth: number,
  panelHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  fov: number,
): number {
  const scale = computeUiScale(canvasWidth)
  const usableW = canvasWidth - 2 * CHROME_SIDE
  const usableH = canvasHeight - NAVBAR_REF_HEIGHT * scale - BOTTOM_BAR_REF_HEIGHT * scale
  const aspect = canvasWidth / canvasHeight
  const tanHalf = Math.tan((fov * Math.PI / 180) / 2)

  const hFrac = usableW / canvasWidth
  const vFrac = usableH / canvasHeight

  const dForWidth = panelWidth / (2 * TARGET_FILL * tanHalf * aspect * hFrac)
  const dForHeight = panelHeight / (2 * TARGET_FILL * tanHalf * vFrac)

  return Math.max(dForWidth, dForHeight)
}

/** Apply distance multiplier to a camera position relative to a lookAt point */
function applyDistMult(
  pos: [number, number, number],
  lookAt: [number, number, number],
  mult: number,
): THREE.Vector3 {
  const result = new THREE.Vector3(...pos)
  if (mult === 1.0) return result
  const target = new THREE.Vector3(...lookAt)
  const offset = result.clone().sub(target)
  offset.multiplyScalar(mult)
  return target.add(offset)
}

/**
 * Camera controller using R3F's useFrame for animation.
 * All camera updates happen inside the R3F render loop so drei's <Html>
 * sees the correct camera position when computing distanceFactor scaling.
 */
export function CameraController() {
  const cameraTarget = useDashboardStore((s) => s.cameraTarget)
  const focusedPanelId = useDashboardStore((s) => s.focusedPanelId)
  const isTransitioning = useDashboardStore((s) => s.isTransitioning)
  const setTransitioning = useDashboardStore((s) => s.setTransitioning)
  const setDragging = useDashboardStore((s) => s.setDragging)

  const targetPos = useRef(new THREE.Vector3(...cameraTarget.position))
  const targetLookAt = useRef(new THREE.Vector3(...cameraTarget.lookAt))
  const currentPos = useRef(new THREE.Vector3(...cameraTarget.position))
  const currentLookAt = useRef(new THREE.Vector3(...cameraTarget.lookAt))

  // Saved overview camera position (preserved across focus/unfocus cycles)
  const savedOverviewPos = useRef(new THREE.Vector3(...cameraTarget.position))
  const savedOverviewLookAt = useRef(new THREE.Vector3(...cameraTarget.lookAt))
  const prevFocusedRef = useRef<string | null>(null)
  // Track the last aspect multiplier so we can re-adjust on resize
  const lastMultRef = useRef(1.0)

  const { gl, camera: threeCamera } = useThree()

  /** Look up the focused panel and compute the capped camera distance multiplier.
   *  For panels at Z>0, caps the offset at MAX_OFFSET so the camera stays
   *  behind the nearer Z layer and doesn't let it occlude the focused panel. */
  const getFitMult = useCallback((panelId: string | null): number => {
    if (!panelId) return 1.0
    const panel = useDashboardStore.getState().panels.find((p) => p.id === panelId)
    if (!panel) return 1.0
    const canvas = gl.domElement
    const fov = (threeCamera as THREE.PerspectiveCamera).fov
    const idealDist = fitIdealDistance(panel.size.width, panel.size.height, canvas.clientWidth, canvas.clientHeight, fov)
    // Z=0 panels have nothing in front — no cap needed
    const maxDist = panel.semantic.detailLevel > 0 ? MAX_OFFSET : idealDist
    return Math.min(idealDist, maxDist) / BASE_OFFSET
  }, [gl, threeCamera])

  // Set initial position immediately, with fit-to-panel multiplier
  useEffect(() => {
    const { focusedPanelId: initFocus } = useDashboardStore.getState()
    const mult = getFitMult(initFocus)
    lastMultRef.current = mult
    const adjusted = applyDistMult(cameraTarget.position, cameraTarget.lookAt, mult)
    currentPos.current.copy(adjusted)
    currentLookAt.current.set(...cameraTarget.lookAt)
    targetPos.current.copy(adjusted)
    targetLookAt.current.set(...cameraTarget.lookAt)
    savedOverviewPos.current.copy(adjusted)
    savedOverviewLookAt.current.set(...cameraTarget.lookAt)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-adjust camera distance when viewport is resized
  useEffect(() => {
    let rafId = 0
    const handleResize = () => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        const { focusedPanelId: fId } = useDashboardStore.getState()
        const newMult = getFitMult(fId)
        const oldMult = lastMultRef.current
        if (Math.abs(newMult - oldMult) < 0.001) return
        lastMultRef.current = newMult

        // Scale the current camera-to-lookAt distance by newMult/oldMult
        const ratio = newMult / oldMult
        const offset = targetPos.current.clone().sub(targetLookAt.current)
        offset.multiplyScalar(ratio)
        targetPos.current.copy(targetLookAt.current).add(offset)
      })
    }
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(rafId)
    }
  }, [getFitMult])

  // Handle transitions between overview ↔ focused, fitting panel to viewport
  useEffect(() => {
    const wasFocused = prevFocusedRef.current !== null
    const isFocused = focusedPanelId !== null
    const mult = getFitMult(focusedPanelId)
    lastMultRef.current = mult

    if (!wasFocused && isFocused) {
      // Overview → Focused: save current (possibly scroll-zoomed) overview position
      savedOverviewPos.current.copy(targetPos.current)
      savedOverviewLookAt.current.copy(targetLookAt.current)

      targetPos.current.copy(applyDistMult(cameraTarget.position, cameraTarget.lookAt, mult))
      targetLookAt.current.set(...cameraTarget.lookAt)
    } else if (wasFocused && !isFocused) {
      // Focused → Overview: restore saved overview position (with zoom)
      targetPos.current.copy(savedOverviewPos.current)
      targetLookAt.current.copy(savedOverviewLookAt.current)
    } else if (isFocused) {
      // Different panel focus — fit new panel to viewport
      targetPos.current.copy(applyDistMult(cameraTarget.position, cameraTarget.lookAt, mult))
      targetLookAt.current.set(...cameraTarget.lookAt)
    } else {
      // Overview layout change
      targetPos.current.copy(applyDistMult(cameraTarget.position, cameraTarget.lookAt, mult))
      targetLookAt.current.set(...cameraTarget.lookAt)
    }

    prevFocusedRef.current = focusedPanelId
  }, [cameraTarget, focusedPanelId, getFitMult])

  // Shared axis navigation — used by wheel, single-finger swipe (X/Y), and two-finger swipe (Z)
  const navigateAxis = useCallback((axis: 'x' | 'y' | 'z', direction: 1 | -1) => {
    const state = useDashboardStore.getState()
    const current = state.panels.find((p) => p.id === state.focusedPanelId)
    if (!current) return
    // Drill out: use navigateBack (follows history) rather than findNeighbor
    if (axis === 'z' && direction === -1) {
      state.navigateBack()
      return
    }
    const neighbor = findNeighbor(state.panels, current, axis, direction)
    if (neighbor) state.navigateTo(neighbor.id, axis)
  }, [])

  // Scroll: Ctrl/Cmd+scroll = zoom, horizontal = X-axis, vertical = Y-axis
  useEffect(() => {
    const forward = new THREE.Vector3()
    let accumulatedDeltaX = 0
    let accumulatedDeltaY = 0
    const SWIPE_THRESHOLD = 120
    let swipeCooldownX = false
    let swipeCooldownY = false

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()

      // Ctrl/Cmd + scroll → zoom
      if (e.ctrlKey || e.metaKey) {
        forward.copy(currentLookAt.current).sub(currentPos.current).normalize()
        targetPos.current.addScaledVector(forward, -e.deltaY * 0.01 * 0.5)
        return
      }

      // Horizontal scroll → X-axis navigation
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 2) {
        if (swipeCooldownX) { accumulatedDeltaX = 0; return }
        accumulatedDeltaX += e.deltaX
        if (Math.abs(accumulatedDeltaX) >= SWIPE_THRESHOLD) {
          const direction = accumulatedDeltaX > 0 ? 1 : -1
          navigateAxis('x', direction as 1 | -1)
          swipeCooldownX = true
          setTimeout(() => { swipeCooldownX = false }, 600)
          accumulatedDeltaX = 0
        }
        accumulatedDeltaY = 0
        return
      }

      // Vertical scroll → Y-axis navigation
      if (Math.abs(e.deltaY) > 2) {
        if (swipeCooldownY) { accumulatedDeltaY = 0; return }
        accumulatedDeltaY += e.deltaY
        if (Math.abs(accumulatedDeltaY) >= SWIPE_THRESHOLD) {
          // Scroll down = negative Y direction, scroll up = positive Y direction
          const direction = accumulatedDeltaY > 0 ? -1 : 1
          navigateAxis('y', direction as 1 | -1)
          swipeCooldownY = true
          setTimeout(() => { swipeCooldownY = false }, 600)
          accumulatedDeltaY = 0
        }
        accumulatedDeltaX = 0
        return
      }
    }
    window.addEventListener('wheel', handleWheel, { passive: false })
    return () => window.removeEventListener('wheel', handleWheel)
  }, [navigateAxis])

  // Mouse-only handler on canvas: drag to pan camera
  useEffect(() => {
    const canvas = gl.domElement
    const DRAG_THRESHOLD = 5
    const PAN_SPEED = 0.005
    const right = new THREE.Vector3()
    const up = new THREE.Vector3()
    const forward = new THREE.Vector3()

    let primaryId = -1
    let startX = 0
    let startY = 0
    let didDrag = false
    let prevX = 0
    let prevY = 0

    const handleDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return // touch handled separately
      primaryId = e.pointerId
      startX = e.clientX
      startY = e.clientY
      didDrag = false
      prevX = e.clientX
      prevY = e.clientY
      canvas.setPointerCapture(e.pointerId)
    }

    const handleMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch' || e.pointerId !== primaryId) return
      const dx = e.clientX - startX
      const dy = e.clientY - startY
      if (!didDrag && Math.hypot(dx, dy) < DRAG_THRESHOLD) return
      if (!didDrag) { didDrag = true; setDragging(true) }

      const moveDx = e.clientX - prevX
      const moveDy = e.clientY - prevY
      prevX = e.clientX
      prevY = e.clientY

      forward.copy(currentLookAt.current).sub(currentPos.current).normalize()
      right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize()
      up.crossVectors(right, forward).normalize()
      targetPos.current.addScaledVector(right, -moveDx * PAN_SPEED)
      targetPos.current.addScaledVector(up, moveDy * PAN_SPEED)
      targetLookAt.current.addScaledVector(right, -moveDx * PAN_SPEED)
      targetLookAt.current.addScaledVector(up, moveDy * PAN_SPEED)
    }

    const handleUp = (e: PointerEvent) => {
      if (e.pointerType === 'touch' || e.pointerId !== primaryId) return
      try { canvas.releasePointerCapture(e.pointerId) } catch { /* already released */ }
      if (didDrag) setTimeout(() => setDragging(false), 50)
      primaryId = -1
    }

    canvas.addEventListener('pointerdown', handleDown)
    canvas.addEventListener('pointermove', handleMove)
    canvas.addEventListener('pointerup', handleUp)
    return () => {
      canvas.removeEventListener('pointerdown', handleDown)
      canvas.removeEventListener('pointermove', handleMove)
      canvas.removeEventListener('pointerup', handleUp)
    }
  }, [gl, setDragging])

  // Touch-only handler on window: scroll navigation, pinch zoom, two-finger tap, double-tap
  // Uses window-level touch events so it works even when the drei <Html> panel
  // overlay covers the canvas (which it does on mobile, ~85% of viewport).
  useEffect(() => {
    const forward = new THREE.Vector3()
    const SCROLL_THRESHOLD = 60   // px accumulated before navigating
    const TWO_FINGER_TAP_MAX_MS = 400
    const TWO_FINGER_TAP_MAX_MOVE = 20
    const DOUBLE_TAP_INTERVAL = 350
    const DOUBLE_TAP_DISTANCE = 30

    // Single-finger scroll state
    let touchId = -1
    let prevX = 0
    let prevY = 0
    let accX = 0
    let accY = 0
    let cooldownX = false
    let cooldownY = false
    let didMove = false
    let startX = 0
    let startY = 0

    // Two-finger state
    let prevPinchDist = 0
    let twoStartCenter = { x: 0, y: 0 }
    let twoLastCenter = { x: 0, y: 0 }
    let twoStartTime = 0

    // Double-tap state
    let lastTapTime = 0
    let lastTapX = 0
    let lastTapY = 0

    function touchDist(a: Touch, b: Touch) {
      return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
    }

    const onStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const t = e.touches[0]
        // Ignore touches on UI chrome (nav, buttons, bottom bar)
        const el = t.target as HTMLElement
        if (el.closest('nav, button, [data-chrome]')) return
        touchId = t.identifier
        prevX = t.clientX
        prevY = t.clientY
        startX = t.clientX
        startY = t.clientY
        accX = 0
        accY = 0
        didMove = false
      } else if (e.touches.length === 2) {
        // Switch to two-finger mode
        touchId = -1
        prevPinchDist = touchDist(e.touches[0], e.touches[1])
        const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2
        const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2
        twoStartCenter = { x: cx, y: cy }
        twoLastCenter = { x: cx, y: cy }
        twoStartTime = Date.now()
      }
    }

    const onMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        // Pinch-to-zoom
        const dist = touchDist(e.touches[0], e.touches[1])
        if (prevPinchDist > 0) {
          const delta = dist - prevPinchDist
          forward.copy(currentLookAt.current).sub(currentPos.current).normalize()
          targetPos.current.addScaledVector(forward, delta * 0.005)
        }
        prevPinchDist = dist
        twoLastCenter = {
          x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
          y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        }
        e.preventDefault() // prevent browser zoom
        return
      }

      if (e.touches.length !== 1 || touchId === -1) return
      const t = Array.from(e.touches).find((tt) => tt.identifier === touchId)
      if (!t) return

      const dx = t.clientX - prevX
      const dy = t.clientY - prevY
      prevX = t.clientX
      prevY = t.clientY
      didMove = true

      // Accumulated-delta scroll navigation
      accX += dx
      accY += dy

      if (!cooldownX && Math.abs(accX) > Math.abs(accY) && Math.abs(accX) >= SCROLL_THRESHOLD) {
        navigateAxis('x', accX > 0 ? -1 : 1)
        cooldownX = true
        setTimeout(() => { cooldownX = false }, 400)
        accX = 0
        accY = 0
      }
      if (!cooldownY && Math.abs(accY) > Math.abs(accX) && Math.abs(accY) >= SCROLL_THRESHOLD) {
        navigateAxis('y', accY > 0 ? 1 : -1)
        cooldownY = true
        setTimeout(() => { cooldownY = false }, 400)
        accX = 0
        accY = 0
      }
    }

    const onEnd = (e: TouchEvent) => {
      // Two-finger tap detection: both fingers lifted quickly with minimal center movement
      if (e.touches.length === 0 && prevPinchDist > 0) {
        const elapsed = Date.now() - twoStartTime
        const centerDist = Math.hypot(
          twoLastCenter.x - twoStartCenter.x,
          twoLastCenter.y - twoStartCenter.y,
        )
        if (elapsed < TWO_FINGER_TAP_MAX_MS && centerDist < TWO_FINGER_TAP_MAX_MOVE) {
          navigateAxis('z', -1)
        }
        prevPinchDist = 0
      }

      // Single-finger: check for double-tap (drill out)
      if (e.touches.length === 0 && touchId !== -1) {
        const totalDist = Math.hypot(
          (e.changedTouches[0]?.clientX ?? startX) - startX,
          (e.changedTouches[0]?.clientY ?? startY) - startY,
        )
        if (!didMove || totalDist < 10) {
          const now = Date.now()
          const tapX = e.changedTouches[0]?.clientX ?? startX
          const tapY = e.changedTouches[0]?.clientY ?? startY
          if (now - lastTapTime < DOUBLE_TAP_INTERVAL &&
              Math.hypot(tapX - lastTapX, tapY - lastTapY) < DOUBLE_TAP_DISTANCE) {
            navigateAxis('z', -1)
            lastTapTime = 0
          } else {
            lastTapTime = now
            lastTapX = tapX
            lastTapY = tapY
          }
        }
        touchId = -1
      }

      // When going from 2 touches to 1, re-initialize single-finger state
      if (e.touches.length === 1) {
        const t = e.touches[0]
        touchId = t.identifier
        prevX = t.clientX
        prevY = t.clientY
        startX = t.clientX
        startY = t.clientY
        accX = 0
        accY = 0
        didMove = false
        prevPinchDist = 0
      }
    }

    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onEnd, { passive: true })
    return () => {
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
    }
  }, [navigateAxis])

  // Camera animation inside R3F's render loop
  useFrame(({ camera }) => {
    const lerpFactor = 0.06

    currentPos.current.lerp(targetPos.current, lerpFactor)
    currentLookAt.current.lerp(targetLookAt.current, lerpFactor)

    camera.position.copy(currentPos.current)
    camera.lookAt(currentLookAt.current)
    camera.updateMatrixWorld()

    if (isTransitioning) {
      const posDist = currentPos.current.distanceTo(targetPos.current)
      const lookDist = currentLookAt.current.distanceTo(targetLookAt.current)
      if (posDist < 0.05 && lookDist < 0.05) {
        setTransitioning(false)
      }
    }
  })

  return null
}
