import { useEffect, useState } from 'react';
import { useSpeechRecorder } from '../../hooks/useSpeechRecorder.ts';
import { useDashboardStore } from '../../store/dashboardStore.ts';

interface SpeechRecognitionButtonProps {
  /** Use Whisper WASM in VR mode (Web Speech API doesn't work in VR) */
  forceWhisper?: boolean;
  /** Scale factor for UI */
  uiScale?: number;
}

type NavigationState = 'idle' | 'navigating' | 'success' | 'error';

/**
 * Gamified speech recognition button with animated sound waves.
 * Features:
 * - Animated concentric wave rings when recording
 * - Pulsing sound wave bars that simulate speech activity
 * - Smooth state transitions with color-coded feedback
 * - Particle effects on successful navigation
 */
export function SpeechRecognitionButton({
  forceWhisper = false,
  uiScale = 1,
}: SpeechRecognitionButtonProps) {
  const {
    state,
    transcript,
    provider,
    startRecording,
    stopRecording,
    clearTranscript,
  } = useSpeechRecorder({ provider: forceWhisper ? 'whisper' : undefined });

  const handleVoiceNavigation = useDashboardStore(
    (s) => s.handleVoiceNavigation,
  );

  const [navState, setNavState] = useState<NavigationState>('idle');
  const [navError, setNavError] = useState<string>('');
  const [targetPanel, setTargetPanel] = useState<string>('');
  const [showFeedback, setShowFeedback] = useState(false);

  // Handle transcript changes - send to API for navigation
  useEffect(() => {
    if (transcript && state === 'idle') {
      setShowFeedback(true);
      setNavState('navigating');

      handleVoiceNavigation(transcript)
        .then((result) => {
          if (result.success) {
            setNavState('success');
            setTargetPanel(result.panelId || '');
            // Auto-hide success after 3 seconds
            setTimeout(() => {
              setShowFeedback(false);
              setNavState('idle');
              clearTranscript();
            }, 3000);
          } else {
            setNavState('error');
            setNavError(result.error || 'Navigation failed');
            // Auto-hide error after 5 seconds
            setTimeout(() => {
              setShowFeedback(false);
              setNavState('idle');
              setNavError('');
              clearTranscript();
            }, 5000);
          }
        })
        .catch((err) => {
          setNavState('error');
          setNavError(err instanceof Error ? err.message : 'Unknown error');
          setTimeout(() => {
            setShowFeedback(false);
            setNavState('idle');
            setNavError('');
            clearTranscript();
          }, 5000);
        });
    }
  }, [transcript, state, handleVoiceNavigation, clearTranscript]);

  const handleClick = () => {
    if (state === 'idle' && navState === 'idle') {
      void startRecording();
    } else if (state === 'recording') {
      stopRecording();
    }
  };

  const getThemeColor = () => {
    if (navState === 'navigating')
      return { primary: '#f59e0b', secondary: '#fbbf24' };
    if (navState === 'error')
      return { primary: '#ef4444', secondary: '#f87171' };
    if (navState === 'success')
      return { primary: '#10b981', secondary: '#34d399' };
    if (state === 'recording')
      return { primary: '#6366f1', secondary: '#818cf8' };
    if (state === 'processing')
      return { primary: '#f59e0b', secondary: '#fbbf24' };
    return { primary: '#3b82f6', secondary: '#60a5fa' };
  };

  const getStatusText = () => {
    if (navState === 'navigating') return 'Analyzing...';
    if (navState === 'success') return 'Success!';
    if (navState === 'error') return 'Try Again';
    if (state === 'recording') return 'Listening...';
    if (state === 'processing') return 'Processing...';
    return 'Tap to Speak';
  };

  const isActive = state === 'recording';
  const isDisabled = state === 'processing' || navState === 'navigating';
  const colors = getThemeColor();

  // Generate random wave heights for visualization
  const waveCount = 5;
  const waveHeights = Array.from({ length: waveCount }, () => {
    const baseHeight = 0.3 + Math.random() * 0.7;
    return isActive ? baseHeight : 0.2;
  });

  return (
    <>
      {/* Feedback Toast */}
      {showFeedback && (
        <div
          style={{
            position: 'absolute',
            bottom: 140,
            right: 20,
            maxWidth: 400,
            padding: '16px 20px',
            background:
              'linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.98))',
            backdropFilter: 'blur(16px)',
            border: `1px solid ${navState === 'error' ? 'rgba(239, 68, 68, 0.4)' : navState === 'success' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(99, 102, 241, 0.4)'}`,
            borderRadius: 16,
            color: '#e0ecff',
            fontSize: 14,
            lineHeight: 1.6,
            zIndex: 10001,
            transform: `scale(${uiScale})`,
            transformOrigin: 'bottom right',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
            animation: 'slideInRight 0.3s ease-out',
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: '#94a3b8',
              marginBottom: 8,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {navState === 'navigating' && (
              <>
                <div className="spinner" />
                Processing ({provider})
              </>
            )}
            {navState === 'success' && '✓ Success'}
            {navState === 'error' && '✗ Error'}
          </div>

          {navState === 'navigating' && (
            <div style={{ color: '#fbbf24', fontWeight: 500 }}>
              "{transcript}"
            </div>
          )}

          {navState === 'success' && (
            <div style={{ color: '#34d399', fontWeight: 500 }}>
              Navigated to: {targetPanel}
            </div>
          )}

          {navState === 'error' && (
            <div style={{ color: '#f87171', fontWeight: 500 }}>
              {navError || 'Could not process your request'}
            </div>
          )}
        </div>
      )}

      {/* Main Voice Button Container */}
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          zIndex: 10000,
          transform: `scale(${uiScale})`,
          transformOrigin: 'bottom right',
        }}
      >
        {/* Floating Particles - idle state decoration */}
        {!isActive &&
          [0, 1, 2, 3].map((i) => (
            <div
              key={`particle-idle-${i}`}
              style={{
                position: 'absolute',
                width: 3,
                height: 3,
                borderRadius: '50%',
                background: colors.primary,
                top: '50%',
                left: '50%',
                opacity: 0,
                animation: `floatParticle ${3 + i * 0.5}s ease-in-out infinite`,
                animationDelay: `${i * 0.7}s`,
                transform: `rotate(${i * 90}deg) translateX(50px)`,
                pointerEvents: 'none',
              }}
            />
          ))}

        {/* Ambient Glow Ring - always visible */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: 110,
            height: 110,
            marginLeft: -55,
            marginTop: -55,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${colors.primary}30 0%, transparent 70%)`,
            animation: 'ambientPulse 3s ease-in-out infinite',
            pointerEvents: 'none',
          }}
        />

        {/* Rotating Gradient Ring - idle decoration */}
        {!isActive && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: 95,
              height: 95,
              marginLeft: -47.5,
              marginTop: -47.5,
              borderRadius: '50%',
              background: `conic-gradient(from 0deg, ${colors.primary}00, ${colors.primary}40, ${colors.primary}00)`,
              animation: 'rotate 8s linear infinite',
              pointerEvents: 'none',
            }}
          />
        )}

        {/* Concentric Wave Rings - expand when active */}
        {isActive &&
          [0, 1, 2].map((index) => (
            <div
              key={`wave-${index}`}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: 100 + index * 30,
                height: 100 + index * 30,
                marginLeft: -(50 + index * 15),
                marginTop: -(50 + index * 15),
                borderRadius: '50%',
                border: `2px solid ${colors.primary}`,
                opacity: 0,
                animation: `waveExpand 2s ease-out infinite`,
                animationDelay: `${index * 0.3}s`,
              }}
            />
          ))}

        {/* Sound Wave Bars - left side */}
        {isActive && (
          <div
            style={{
              position: 'absolute',
              left: -80,
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              height: 60,
            }}
          >
            {waveHeights.map((height, i) => (
              <div
                key={`wave-left-${i}`}
                style={{
                  width: 4,
                  height: `${height * 100}%`,
                  background: `linear-gradient(to top, ${colors.primary}, ${colors.secondary})`,
                  borderRadius: 2,
                  animation: `waveBar ${0.6 + Math.random() * 0.4}s ease-in-out infinite alternate`,
                  animationDelay: `${i * 0.1}s`,
                  opacity: 0.8,
                }}
              />
            ))}
          </div>
        )}

        {/* Sound Wave Bars - right side (mirrored) */}
        {isActive && (
          <div
            style={{
              position: 'absolute',
              right: -80,
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              height: 60,
            }}
          >
            {waveHeights
              .slice()
              .reverse()
              .map((height, i) => (
                <div
                  key={`wave-right-${i}`}
                  style={{
                    width: 4,
                    height: `${height * 100}%`,
                    background: `linear-gradient(to top, ${colors.primary}, ${colors.secondary})`,
                    borderRadius: 2,
                    animation: `waveBar ${0.6 + Math.random() * 0.4}s ease-in-out infinite alternate`,
                    animationDelay: `${i * 0.1}s`,
                    opacity: 0.8,
                  }}
                />
              ))}
          </div>
        )}

        {/* Outer Ring - decorative border */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: 88,
            height: 88,
            marginLeft: -44,
            marginTop: -44,
            borderRadius: '50%',
            border: `2px solid ${colors.primary}40`,
            pointerEvents: 'none',
            animation: isActive ? 'none' : 'breathe 4s ease-in-out infinite',
          }}
        />

        {/* Main Button */}
        <button
          onClick={handleClick}
          disabled={isDisabled}
          style={{
            position: 'relative',
            width: 80,
            height: 80,
            borderRadius: '50%',
            border: `1px solid ${colors.primary}60`,
            background: `
              radial-gradient(circle at 30% 30%, ${colors.secondary}dd, ${colors.primary}),
              linear-gradient(135deg, ${colors.primary}, ${colors.secondary})
            `,
            color: '#ffffff',
            cursor: isDisabled ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 2,
            boxShadow: `
              0 8px 24px ${colors.primary}50,
              0 0 0 4px ${colors.primary}15,
              inset 0 2px 4px rgba(255,255,255,0.1),
              inset 0 -2px 4px rgba(0,0,0,0.2)
            `,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            opacity: isDisabled ? 0.7 : 1,
            transform: isActive ? 'scale(1.1)' : 'scale(1)',
          }}
          onMouseEnter={(e) => {
            if (!isDisabled) {
              e.currentTarget.style.transform = isActive
                ? 'scale(1.15)'
                : 'scale(1.05)';
              e.currentTarget.style.boxShadow = `
                0 12px 32px ${colors.primary}60,
                0 0 0 6px ${colors.primary}25,
                inset 0 2px 4px rgba(255,255,255,0.15),
                inset 0 -2px 4px rgba(0,0,0,0.2)
              `;
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = isActive
              ? 'scale(1.1)'
              : 'scale(1)';
            e.currentTarget.style.boxShadow = `
              0 8px 24px ${colors.primary}50,
              0 0 0 4px ${colors.primary}15,
              inset 0 2px 4px rgba(255,255,255,0.1),
              inset 0 -2px 4px rgba(0,0,0,0.2)
            `;
          }}
        >
          {/* Glass reflection effect */}
          <div
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              right: 8,
              height: 20,
              borderRadius: '50% 50% 0 0',
              background:
                'linear-gradient(to bottom, rgba(255,255,255,0.3), transparent)',
              pointerEvents: 'none',
            }}
          />
          {/* Microphone Icon */}
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
              transition: 'transform 0.2s',
              transform: isActive ? 'scale(1.1)' : 'scale(1)',
            }}
          >
            {state === 'recording' ? (
              <>
                <rect
                  x="9"
                  y="2"
                  width="6"
                  height="11"
                  rx="3"
                  fill="currentColor"
                />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </>
            ) : (
              <>
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </>
            )}
          </svg>

          {/* Status Text */}
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginTop: 2,
              textShadow: '0 1px 2px rgba(0,0,0,0.2)',
            }}
          >
            {getStatusText()}
          </span>

          {/* Processing Spinner Overlay */}
          {(state === 'processing' || navState === 'navigating') && (
            <div
              style={{
                position: 'absolute',
                inset: -4,
                borderRadius: '50%',
                border: '3px solid transparent',
                borderTopColor: '#ffffff',
                animation: 'spin 1s linear infinite',
              }}
            />
          )}

          {/* Success Particles */}
          {navState === 'success' &&
            [0, 1, 2, 3, 4].map((i) => (
              <div
                key={`particle-${i}`}
                style={{
                  position: 'absolute',
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  background: '#ffffff',
                  top: '50%',
                  left: '50%',
                  opacity: 0,
                  animation: `particle 0.8s ease-out forwards`,
                  animationDelay: `${i * 0.05}s`,
                  transform: `rotate(${i * 72}deg) translateX(0)`,
                }}
              />
            ))}
        </button>

        {/* Hint Text - only show in idle state */}
        {state === 'idle' && navState === 'idle' && (
          <div
            style={{
              position: 'absolute',
              bottom: -32,
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: 11,
              color: colors.primary,
              fontWeight: 500,
              whiteSpace: 'nowrap',
              textAlign: 'center',
              opacity: 0.7,
              animation: 'fadeInUp 1s ease-out 0.5s both',
              pointerEvents: 'none',
              textShadow: '0 1px 2px rgba(0,0,0,0.3)',
            }}
          >
            Click to speak
          </div>
        )}
      </div>

      <style>{`
        @keyframes waveExpand {
          0% {
            transform: scale(0.8);
            opacity: 0.6;
          }
          100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }

        @keyframes waveBar {
          0% {
            transform: scaleY(0.3);
          }
          100% {
            transform: scaleY(1);
          }
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes rotate {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes particle {
          0% {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateX(40px) scale(0);
          }
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(20px) scale(${uiScale});
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(${uiScale});
          }
        }

        @keyframes ambientPulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.4;
          }
          50% {
            transform: scale(1.15);
            opacity: 0.6;
          }
        }

        @keyframes breathe {
          0%, 100% {
            transform: scale(1);
            opacity: 0.4;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.7;
          }
        }

        @keyframes floatParticle {
          0%, 100% {
            opacity: 0;
            transform: translateY(0) scale(0.8);
          }
          50% {
            opacity: 0.6;
            transform: translateY(-15px) scale(1.2);
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(10px);
          }
          to {
            opacity: 0.7;
            transform: translateX(-50%) translateY(0);
          }
        }

        .spinner {
          width: 12px;
          height: 12px;
          border: 2px solid #94a3b8;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
      `}</style>
    </>
  );
}
