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
    const SWIPE_THRESHOLD = 80
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
        if (swipeCooldownX) return
        accumulatedDeltaX += e.deltaX
        if (Math.abs(accumulatedDeltaX) >= SWIPE_THRESHOLD) {
          const direction = accumulatedDeltaX > 0 ? 1 : -1
          navigateAxis('x', direction as 1 | -1)
          swipeCooldownX = true
          setTimeout(() => { swipeCooldownX = false }, 400)
          accumulatedDeltaX = 0
        }
        accumulatedDeltaY = 0
        return
      }

      // Vertical scroll → Y-axis navigation
      if (Math.abs(e.deltaY) > 2) {
        if (swipeCooldownY) return
        accumulatedDeltaY += e.deltaY
        if (Math.abs(accumulatedDeltaY) >= SWIPE_THRESHOLD) {
          // Scroll down = negative Y direction, scroll up = positive Y direction
          const direction = accumulatedDeltaY > 0 ? -1 : 1
          navigateAxis('y', direction as 1 | -1)
          swipeCooldownY = true
          setTimeout(() => { swipeCooldownY = false }, 400)
          accumulatedDeltaY = 0
        }
        accumulatedDeltaX = 0
        return
      }
    }
    window.addEventListener('wheel', handleWheel, { passive: false })
    return () => window.removeEventListener('wheel', handleWheel)
  }, [navigateAxis])

  // Multi-pointer handler: single-finger drag/swipe + pinch-to-zoom
  useEffect(() => {
    const canvas = gl.domElement
    const DRAG_THRESHOLD = 5 // px — distinguishes click from drag
    const PAN_SPEED = 0.005
    const SWIPE_MAX_DURATION = 300 // ms
    const SWIPE_MIN_DISTANCE = 50 // px

    const right = new THREE.Vector3()
    const up = new THREE.Vector3()
    const forward = new THREE.Vector3()

    // Track all active pointers
    const pointers = new Map<number, { x: number; y: number }>()

    // Single-pointer state
    let primaryId = -1
    let startX = 0
    let startY = 0
    let startTime = 0
    let didDrag = false
    let prevX = 0
    let prevY = 0

    // Pinch state
    let prevPinchDist = 0

    // Two-finger tap state (drill out)
    let twoFingerStartCenter = { x: 0, y: 0 }
    let twoFingerLastCenter = { x: 0, y: 0 }
    let twoFingerStartTime = 0
    const TWO_FINGER_TAP_MAX_DURATION = 400 // ms
    const TWO_FINGER_TAP_MAX_MOVE = 20 // px — center movement threshold

    // Double-tap state (drill out)
    let lastTapTime = 0
    let lastTapX = 0
    let lastTapY = 0
    const DOUBLE_TAP_INTERVAL = 350 // ms
    const DOUBLE_TAP_DISTANCE = 30 // px

    function getPointerDistance(): number {
      const pts = Array.from(pointers.values())
      if (pts.length < 2) return 0
      const dx = pts[1].x - pts[0].x
      const dy = pts[1].y - pts[0].y
      return Math.hypot(dx, dy)
    }

    const handlePointerDown = (e: PointerEvent) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

      if (pointers.size === 1) {
        // First pointer — start tracking for drag/swipe
        primaryId = e.pointerId
        startX = e.clientX
        startY = e.clientY
        startTime = Date.now()
        didDrag = false
        prevX = e.clientX
        prevY = e.clientY
        canvas.setPointerCapture(e.pointerId)
      } else if (pointers.size === 2) {
        // Second pointer — switch to pinch/two-finger-swipe mode, cancel any drag
        prevPinchDist = getPointerDistance()
        const pts = Array.from(pointers.values())
        twoFingerStartCenter = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 }
        twoFingerLastCenter = { ...twoFingerStartCenter }
        twoFingerStartTime = Date.now()
        if (didDrag) {
          didDrag = false
          setDragging(false)
        }
      }
    }

    const handlePointerMove = (e: PointerEvent) => {
      const ptr = pointers.get(e.pointerId)
      if (!ptr) return
      ptr.x = e.clientX
      ptr.y = e.clientY

      if (pointers.size === 2) {
        // Pinch-to-zoom
        const dist = getPointerDistance()
        if (prevPinchDist > 0) {
          const delta = dist - prevPinchDist
          forward.copy(currentLookAt.current).sub(currentPos.current).normalize()
          targetPos.current.addScaledVector(forward, delta * 0.005)
        }
        prevPinchDist = dist
        // Track center for two-finger swipe detection
        const pts = Array.from(pointers.values())
        twoFingerLastCenter = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 }
        return
      }

      if (pointers.size !== 1 || e.pointerId !== primaryId) return

      // Single pointer — pan (drag)
      const dx = e.clientX - startX
      const dy = e.clientY - startY

      if (!didDrag && Math.hypot(dx, dy) < DRAG_THRESHOLD) return

      if (!didDrag) {
        didDrag = true
        setDragging(true)
      }

      const moveDx = e.clientX - prevX
      const moveDy = e.clientY - prevY
      prevX = e.clientX
      prevY = e.clientY

      // Compute camera right and up vectors
      forward.copy(currentLookAt.current).sub(currentPos.current).normalize()
      right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize()
      up.crossVectors(right, forward).normalize()

      // Translate camera position and lookAt
      const panX = -moveDx * PAN_SPEED
      const panY = moveDy * PAN_SPEED

      targetPos.current.addScaledVector(right, panX)
      targetPos.current.addScaledVector(up, panY)
      targetLookAt.current.addScaledVector(right, panX)
      targetLookAt.current.addScaledVector(up, panY)
    }

    const handlePointerUp = (e: PointerEvent) => {
      const wasInPointers = pointers.has(e.pointerId)
      pointers.delete(e.pointerId)

      if (!wasInPointers) return

      // Release capture
      try { canvas.releasePointerCapture(e.pointerId) } catch { /* already released */ }

      // Detect two-finger tap (drill out): brief touch with minimal center movement
      // Check before single-pointer handling, when going from 2 pointers to fewer
      if (pointers.size <= 1 && prevPinchDist > 0) {
        const elapsed = Date.now() - twoFingerStartTime
        const centerDist = Math.hypot(
          twoFingerLastCenter.x - twoFingerStartCenter.x,
          twoFingerLastCenter.y - twoFingerStartCenter.y,
        )
        if (elapsed < TWO_FINGER_TAP_MAX_DURATION && centerDist < TWO_FINGER_TAP_MAX_MOVE) {
          navigateAxis('z', -1)
        }
      }

      if (e.pointerId === primaryId) {
        const elapsed = Date.now() - startTime
        const totalDx = e.clientX - startX
        const totalDy = e.clientY - startY
        const totalDist = Math.hypot(totalDx, totalDy)

        // Quick swipe detection: short duration + enough distance
        if (elapsed < SWIPE_MAX_DURATION && totalDist > SWIPE_MIN_DISTANCE) {
          if (Math.abs(totalDx) > Math.abs(totalDy)) {
            navigateAxis('x', totalDx > 0 ? -1 : 1)
          } else {
            navigateAxis('y', totalDy > 0 ? 1 : -1)
          }
        }

        // Double-tap detection (drill out): two quick taps close together
        if (!didDrag && totalDist < DRAG_THRESHOLD) {
          const now = Date.now()
          if (now - lastTapTime < DOUBLE_TAP_INTERVAL &&
              Math.hypot(e.clientX - lastTapX, e.clientY - lastTapY) < DOUBLE_TAP_DISTANCE) {
            navigateAxis('z', -1)
            lastTapTime = 0
          } else {
            lastTapTime = now
            lastTapX = e.clientX
            lastTapY = e.clientY
          }
        }

        if (didDrag) {
          setTimeout(() => setDragging(false), 50)
        }
        primaryId = -1
      }

      // If transitioning from 2 pointers to 1, re-initialize single-pointer state
      if (pointers.size === 1) {
        const [[id, pt]] = Array.from(pointers.entries())
        primaryId = id
        startX = pt.x
        startY = pt.y
        startTime = Date.now()
        didDrag = false
        prevX = pt.x
        prevY = pt.y
        prevPinchDist = 0
      }
    }

    const handlePointerCancel = (e: PointerEvent) => {
      pointers.delete(e.pointerId)
      if (e.pointerId === primaryId) {
        primaryId = -1
        setDragging(false)
      }
    }

    canvas.addEventListener('pointerdown', handlePointerDown)
    canvas.addEventListener('pointermove', handlePointerMove)
    canvas.addEventListener('pointerup', handlePointerUp)
    canvas.addEventListener('pointercancel', handlePointerCancel)
    canvas.addEventListener('lostpointercapture', handlePointerCancel)
    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown)
      canvas.removeEventListener('pointermove', handlePointerMove)
      canvas.removeEventListener('pointerup', handlePointerUp)
      canvas.removeEventListener('pointercancel', handlePointerCancel)
      canvas.removeEventListener('lostpointercapture', handlePointerCancel)
    }
  }, [gl, setDragging, navigateAxis])

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
