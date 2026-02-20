import { useEffect, useState } from 'react'
import { useSpeechRecorder } from '../../hooks/useSpeechRecorder.ts'
import { useDashboardStore } from '../../store/dashboardStore.ts'

interface SpeechRecognitionButtonProps {
  /** Use Whisper WASM in VR mode (Web Speech API doesn't work in VR) */
  forceWhisper?: boolean
  /** Scale factor for UI */
  uiScale?: number
}

type NavigationState = 'idle' | 'navigating' | 'success' | 'error'

/**
 * Desktop speech recognition button — appears at the bottom right of the screen.
 * Toggles recording on click, sends transcript to API for navigation.
 */
export function SpeechRecognitionButton({
  forceWhisper = false,
  uiScale = 1,
}: SpeechRecognitionButtonProps) {
  const { state, transcript, backend, startRecording, stopRecording, clearTranscript } =
    useSpeechRecorder({ forceWhisper })

  const handleVoiceNavigation = useDashboardStore((s) => s.handleVoiceNavigation)

  const [navState, setNavState] = useState<NavigationState>('idle')
  const [navError, setNavError] = useState<string>('')
  const [targetPanel, setTargetPanel] = useState<string>('')
  const [showFeedback, setShowFeedback] = useState(false)

  // Handle transcript changes - send to API for navigation
  useEffect(() => {
    if (transcript && state === 'idle') {
      setShowFeedback(true)
      setNavState('navigating')

      handleVoiceNavigation(transcript)
        .then((result) => {
          if (result.success) {
            setNavState('success')
            setTargetPanel(result.panelId || '')
            // Auto-hide success after 3 seconds
            setTimeout(() => {
              setShowFeedback(false)
              setNavState('idle')
              clearTranscript()
            }, 3000)
          } else {
            setNavState('error')
            setNavError(result.error || 'Navigation failed')
            // Auto-hide error after 5 seconds
            setTimeout(() => {
              setShowFeedback(false)
              setNavState('idle')
              setNavError('')
              clearTranscript()
            }, 5000)
          }
        })
        .catch((err) => {
          setNavState('error')
          setNavError(err instanceof Error ? err.message : 'Unknown error')
          setTimeout(() => {
            setShowFeedback(false)
            setNavState('idle')
            setNavError('')
            clearTranscript()
          }, 5000)
        })
    }
  }, [transcript, state, handleVoiceNavigation, clearTranscript])

  const handleClick = () => {
    if (state === 'idle' && navState === 'idle') {
      void startRecording()
    } else if (state === 'recording') {
      stopRecording()
    }
  }

  const getButtonColor = () => {
    if (navState === 'navigating') return '#f59e0b' // orange when navigating
    if (navState === 'error') return '#ef4444' // red on error
    if (navState === 'success') return '#10b981' // green on success
    if (state === 'recording') return '#ef4444' // red when recording
    if (state === 'processing') return '#f59e0b' // orange when processing
    return '#3b82f6' // blue when idle
  }

  const getButtonText = () => {
    if (navState === 'navigating') return 'Finding...'
    if (navState === 'success') return 'Found!'
    if (navState === 'error') return 'Error'
    if (state === 'recording') return 'Stop'
    if (state === 'processing') return 'Processing...'
    return 'Voice'
  }

  const isPulseActive = state === 'recording'
  const isDisabled = state === 'processing' || navState === 'navigating'

  return (
    <>
      {/* Feedback display */}
      {showFeedback && (
        <div
          style={{
            position: 'absolute',
            bottom: 120,
            right: 20,
            maxWidth: 400,
            padding: '12px 16px',
            background: 'rgba(10, 10, 26, 0.95)',
            backdropFilter: 'blur(12px)',
            border: `1px solid ${navState === 'error' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(60, 80, 120, 0.3)'}`,
            borderRadius: 8,
            color: '#c0d0e0',
            fontSize: 14,
            lineHeight: 1.5,
            zIndex: 10001,
            transform: `scale(${uiScale})`,
            transformOrigin: 'bottom right',
          }}
        >
          <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>
            {navState === 'navigating' && `Navigating (${backend})...`}
            {navState === 'success' && 'Navigation successful!'}
            {navState === 'error' && 'Navigation failed'}
          </div>

          {navState === 'navigating' && (
            <div style={{ color: '#f59e0b' }}>
              "{transcript}"
            </div>
          )}

          {navState === 'success' && (
            <div style={{ color: '#10b981' }}>
              Navigating to: {targetPanel}
            </div>
          )}

          {navState === 'error' && (
            <div style={{ color: '#ef4444' }}>
              {navError || 'Could not find matching panel'}
            </div>
          )}

          {transcript && navState === 'idle' && (
            <div>"{transcript}"</div>
          )}
        </div>
      )}

      {/* Speech button */}
      <button
        onClick={handleClick}
        disabled={isDisabled}
        style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          width: 64,
          height: 64,
          borderRadius: '50%',
          border: 'none',
          background: getButtonColor(),
          color: '#ffffff',
          fontSize: 12,
          fontWeight: 600,
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 4,
          zIndex: 10000,
          transform: `scale(${uiScale})`,
          transformOrigin: 'bottom right',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          transition: 'all 0.2s ease',
          animation: isPulseActive ? 'pulse 1.5s ease-in-out infinite' : 'none',
          opacity: isDisabled ? 0.7 : 1,
        }}
        onMouseEnter={(e) => {
          if (!isDisabled) {
            e.currentTarget.style.transform = `scale(${uiScale * 1.05})`
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = `scale(${uiScale})`
        }}
      >
        {/* Microphone icon */}
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {state === 'recording' ? (
            <rect x="9" y="2" width="6" height="11" rx="3" />
          ) : (
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          )}
          <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
        </svg>
        <span style={{ fontSize: 10 }}>{getButtonText()}</span>
      </button>

      <style>{`
        @keyframes pulse {
          0%, 100% {
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3), 0 0 0 0 rgba(239, 68, 68, 0.7);
          }
          50% {
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3), 0 0 0 10px rgba(239, 68, 68, 0);
          }
        }
      `}</style>
    </>
  )
}
