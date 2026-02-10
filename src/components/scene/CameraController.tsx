import { useRef, useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useDashboardStore } from '../../store/dashboardStore.ts'

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

  const { gl } = useThree()

  // Set initial position immediately
  useEffect(() => {
    currentPos.current.set(...cameraTarget.position)
    currentLookAt.current.set(...cameraTarget.lookAt)
    targetPos.current.set(...cameraTarget.position)
    targetLookAt.current.set(...cameraTarget.lookAt)
    savedOverviewPos.current.set(...cameraTarget.position)
    savedOverviewLookAt.current.set(...cameraTarget.lookAt)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Handle transitions between overview ↔ focused, preserving zoom level
  useEffect(() => {
    const wasFocused = prevFocusedRef.current !== null
    const isFocused = focusedPanelId !== null

    if (!wasFocused && isFocused) {
      // Overview → Focused: save current (possibly scroll-zoomed) overview position
      savedOverviewPos.current.copy(targetPos.current)
      savedOverviewLookAt.current.copy(targetLookAt.current)
      // Animate to the focused panel
      targetPos.current.set(...cameraTarget.position)
      targetLookAt.current.set(...cameraTarget.lookAt)
    } else if (wasFocused && !isFocused) {
      // Focused → Overview: restore saved overview position (with zoom)
      targetPos.current.copy(savedOverviewPos.current)
      targetLookAt.current.copy(savedOverviewLookAt.current)
    } else {
      // Same focus state (layout change, different panel focus, etc.)
      targetPos.current.set(...cameraTarget.position)
      targetLookAt.current.set(...cameraTarget.lookAt)
    }

    prevFocusedRef.current = focusedPanelId
  }, [cameraTarget, focusedPanelId])

  // Scroll wheel zoom — listen on window so it works even over Html overlays
  useEffect(() => {
    const forward = new THREE.Vector3()
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      forward.copy(currentLookAt.current).sub(currentPos.current).normalize()
      targetPos.current.addScaledVector(forward, -e.deltaY * 0.01 * 0.5)
    }
    window.addEventListener('wheel', handleWheel, { passive: false })
    return () => window.removeEventListener('wheel', handleWheel)
  }, [])

  // Left-click drag to pan — translates camera along right/up axes
  useEffect(() => {
    const canvas = gl.domElement
    const DRAG_THRESHOLD = 5 // px — distinguishes click from drag
    const PAN_SPEED = 0.005

    let isDown = false
    let startX = 0
    let startY = 0
    let didDrag = false

    const right = new THREE.Vector3()
    const up = new THREE.Vector3()
    const forward = new THREE.Vector3()

    let pointerId = -1

    const handlePointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return // left button only
      isDown = true
      didDrag = false
      startX = e.clientX
      startY = e.clientY
      pointerId = e.pointerId
      canvas.setPointerCapture(e.pointerId)
    }

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDown) return
      const dx = e.clientX - startX
      const dy = e.clientY - startY

      if (!didDrag && Math.hypot(dx, dy) < DRAG_THRESHOLD) return

      if (!didDrag) {
        didDrag = true
        setDragging(true)
      }

      const moveDx = e.movementX
      const moveDy = e.movementY

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

    const handlePointerUp = () => {
      if (!isDown) return
      if (didDrag) {
        // Clear dragging flag after a tick so onPointerMissed sees it
        setTimeout(() => setDragging(false), 50)
      }
      isDown = false
      if (pointerId >= 0) {
        canvas.releasePointerCapture(pointerId)
        pointerId = -1
      }
    }

    const handlePointerCancel = () => {
      isDown = false
      pointerId = -1
      setDragging(false)
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
  }, [gl, setDragging])

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
