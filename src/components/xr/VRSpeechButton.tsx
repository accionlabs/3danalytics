import { useRef, useMemo, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Interactive } from '@react-three/xr'
import { useSpeechRecorder } from '../../hooks/useSpeechRecorder.ts'
import { useDashboardStore } from '../../store/dashboardStore.ts'

type NavigationState = 'idle' | 'navigating' | 'success' | 'error'

/**
 * VR speech recognition button — appears as a floating 3D button in VR space.
 * Always uses Whisper WASM backend (Web Speech API doesn't work in VR).
 * Positioned below the HUD for easy access.
 */
export function VRSpeechButton() {
  const buttonMeshRef = useRef<THREE.Mesh>(null)
  const feedbackMeshRef = useRef<THREE.Mesh>(null)
  const lastText = useRef('')
  const [navState, setNavState] = useState<NavigationState>('idle')
  const [navMessage, setNavMessage] = useState('')
  const [showFeedback, setShowFeedback] = useState(false)

  const { state, transcript, startRecording, stopRecording, clearTranscript } =
    useSpeechRecorder({ forceWhisper: true }) // Always use Whisper in VR

  const handleVoiceNavigation = useDashboardStore((s) => s.handleVoiceNavigation)

  // Button canvas texture
  const buttonCanvas = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 256
    c.height = 128
    return c
  }, [])

  const buttonTexture = useMemo(() => {
    const tex = new THREE.CanvasTexture(buttonCanvas)
    tex.needsUpdate = true
    return tex
  }, [buttonCanvas])

  // Feedback canvas texture
  const feedbackCanvas = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 1024
    c.height = 128
    return c
  }, [])

  const feedbackTexture = useMemo(() => {
    const tex = new THREE.CanvasTexture(feedbackCanvas)
    tex.needsUpdate = true
    return tex
  }, [feedbackCanvas])

  // Handle transcript changes - send to API for navigation
  useEffect(() => {
    if (transcript && state === 'idle') {
      setShowFeedback(true)
      setNavState('navigating')
      setNavMessage(`Navigating: "${transcript}"`)

      handleVoiceNavigation(transcript)
        .then((result) => {
          if (result.success) {
            setNavState('success')
            setNavMessage(`Found: ${result.panelId || 'panel'}`)
            // Auto-hide success after 3 seconds
            setTimeout(() => {
              setShowFeedback(false)
              setNavState('idle')
              setNavMessage('')
              clearTranscript()
            }, 3000)
          } else {
            setNavState('error')
            setNavMessage(`Error: ${result.error || 'Navigation failed'}`)
            // Auto-hide error after 5 seconds
            setTimeout(() => {
              setShowFeedback(false)
              setNavState('idle')
              setNavMessage('')
              clearTranscript()
            }, 5000)
          }
        })
        .catch((err) => {
          setNavState('error')
          setNavMessage(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
          setTimeout(() => {
            setShowFeedback(false)
            setNavState('idle')
            setNavMessage('')
            clearTranscript()
          }, 5000)
        })
    }
  }, [transcript, state, handleVoiceNavigation, clearTranscript])

  // Update button appearance based on state
  useFrame(() => {
    const buttonText =
      navState === 'navigating' ? 'FINDING...' :
      navState === 'success' ? 'FOUND!' :
      navState === 'error' ? 'ERROR' :
      state === 'recording' ? 'STOP' :
      state === 'processing' ? 'PROCESSING...' : 'VOICE'

    const color =
      navState === 'navigating' ? '#f59e0b' :
      navState === 'success' ? '#10b981' :
      navState === 'error' ? '#ef4444' :
      state === 'recording' ? '#ef4444' :
      state === 'processing' ? '#f59e0b' : '#3b82f6'

    if (buttonText !== lastText.current) {
      lastText.current = buttonText

      const ctx = buttonCanvas.getContext('2d')!
      ctx.clearRect(0, 0, buttonCanvas.width, buttonCanvas.height)

      // Button background
      ctx.fillStyle = color
      ctx.fillRect(0, 0, buttonCanvas.width, buttonCanvas.height)

      // Button text
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 32px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(buttonText, buttonCanvas.width / 2, buttonCanvas.height / 2)

      buttonTexture.needsUpdate = true
    }

    // Update button material color for pulse effect when recording
    const mesh = buttonMeshRef.current
    if (mesh && mesh.material instanceof THREE.MeshBasicMaterial) {
      if (state === 'recording') {
        const pulse = Math.sin(Date.now() * 0.005) * 0.3 + 0.7
        mesh.material.opacity = pulse
      } else {
        mesh.material.opacity = 1
      }
    }

    // Update feedback display
    if (showFeedback && navMessage) {
      const ctx = feedbackCanvas.getContext('2d')!
      ctx.clearRect(0, 0, feedbackCanvas.width, feedbackCanvas.height)

      const bgColor =
        navState === 'error' ? 'rgba(239, 68, 68, 0.9)' :
        navState === 'success' ? 'rgba(16, 185, 129, 0.9)' :
        'rgba(10, 10, 26, 0.9)'

      ctx.fillStyle = bgColor
      ctx.fillRect(0, 0, feedbackCanvas.width, feedbackCanvas.height)

      ctx.fillStyle = '#ffffff'
      ctx.font = '24px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      // Wrap text if too long
      const maxWidth = feedbackCanvas.width - 40
      const words = navMessage.split(' ')
      let line = ''
      let y = feedbackCanvas.height / 2

      for (const word of words) {
        const testLine = line + word + ' '
        const metrics = ctx.measureText(testLine)
        if (metrics.width > maxWidth && line !== '') {
          ctx.fillText(line, feedbackCanvas.width / 2, y - 15)
          line = word + ' '
          y += 30
        } else {
          line = testLine
        }
      }
      ctx.fillText(line, feedbackCanvas.width / 2, y - (line === navMessage ? 0 : 15))

      feedbackTexture.needsUpdate = true
    }
  })

  const handleClick = () => {
    if (state === 'idle' && navState === 'idle') {
      void startRecording()
    } else if (state === 'recording') {
      stopRecording()
    }
  }

  const isDisabled = state === 'processing' || navState === 'navigating'

  return (
    <group>
      {/* Speech button */}
      <Interactive onSelect={isDisabled ? undefined : handleClick}>
        <mesh ref={buttonMeshRef} position={[0, 1.2, -2]}>
          <planeGeometry args={[0.6, 0.3]} />
          <meshBasicMaterial
            map={buttonTexture}
            transparent
            opacity={1}
            depthTest={false}
            depthWrite={false}
          />
        </mesh>
      </Interactive>

      {/* Feedback display (shown during navigation) */}
      {showFeedback && navMessage && (
        <mesh ref={feedbackMeshRef} position={[0, 0.8, -2]}>
          <planeGeometry args={[2, 0.25]} />
          <meshBasicMaterial
            map={feedbackTexture}
            transparent
            depthTest={false}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  )
}
