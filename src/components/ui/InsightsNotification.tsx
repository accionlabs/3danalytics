import { useEffect, useState } from 'react'
import { stopSpeaking } from '../../utils/ttsManager.ts'

export interface InsightsNotificationProps {
  /** Array of insights to display */
  insights: string[]
  /** Callback when dismissed */
  onDismiss?: () => void
  /** Auto-dismiss after duration (ms), 0 = manual only */
  autoDismiss?: number
}

/**
 * Displays key insights with visual feedback while TTS is reading them.
 * Provides skip/dismiss controls for better UX.
 */
export function InsightsNotification({
  insights,
  onDismiss,
  autoDismiss = 0,
}: InsightsNotificationProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [isAnimating, setIsAnimating] = useState(false)

  const handleDismiss = () => {
    setIsAnimating(false)
    setTimeout(() => {
      setIsVisible(false)
      onDismiss?.()
    }, 300)
  }

  useEffect(() => {
    // Fade in animation
    setIsAnimating(true)

    // Auto-dismiss if specified
    if (autoDismiss > 0) {
      const timer = setTimeout(() => {
        handleDismiss()
      }, autoDismiss)
      return () => clearTimeout(timer)
    }
  }, [autoDismiss, handleDismiss])

  const handleSkip = () => {
    stopSpeaking()
    handleDismiss()
  }

  if (!isVisible || insights.length === 0) {
    return null
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 24,
        right: 24,
        transform: `translateX(${isAnimating ? '0' : '20px'})`,
        opacity: isAnimating ? 1 : 0,
        transition: 'all 0.3s ease-out',
        zIndex: 10002,
        maxWidth: '400px',
        width: 'auto',
        minWidth: '320px',
      }}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.98))',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(100, 116, 139, 0.3)',
          borderRadius: '12px',
          padding: '14px 16px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 1px rgba(255, 255, 255, 0.1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Audio indicator */}
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'pulse 2s ease-in-out infinite',
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: '12px' }}>🔊</span>
            </div>

            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#e0ecff',
                  lineHeight: 1.3,
                }}
              >
                Key Insights
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: '11px',
                  color: '#94a3b8',
                  lineHeight: 1.3,
                }}
              >
                {insights.length} insight{insights.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Skip button */}
          <button
            onClick={handleSkip}
            style={{
              background: 'rgba(100, 116, 139, 0.2)',
              border: '1px solid rgba(100, 116, 139, 0.3)',
              borderRadius: '6px',
              padding: '6px 12px',
              color: '#cbd5e1',
              fontSize: '11px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(100, 116, 139, 0.3)'
              e.currentTarget.style.borderColor = 'rgba(100, 116, 139, 0.5)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(100, 116, 139, 0.2)'
              e.currentTarget.style.borderColor = 'rgba(100, 116, 139, 0.3)'
            }}
          >
            Skip
          </button>
        </div>

        {/* Insights list */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            maxHeight: '200px',
            overflowY: 'auto',
          }}
        >
          {insights.map((insight, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                gap: '10px',
                padding: '10px',
                background: 'rgba(30, 41, 59, 0.5)',
                borderRadius: '6px',
                border: '1px solid rgba(71, 85, 105, 0.3)',
              }}
            >
              <span
                style={{
                  flexShrink: 0,
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: 'rgba(59, 130, 246, 0.2)',
                  border: '1px solid rgba(59, 130, 246, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#60a5fa',
                  fontSize: '10px',
                  fontWeight: 600,
                }}
              >
                {index + 1}
              </span>
              <p
                style={{
                  margin: 0,
                  color: '#cbd5e1',
                  fontSize: '12px',
                  lineHeight: '1.5',
                  flex: 1,
                }}
              >
                {insight}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.9;
          }
        }
      `}</style>
    </div>
  )
}
