import { useCallback, useRef } from 'react'

export interface TextToSpeechOptions {
  /** Voice language (e.g., 'en-US', 'en-GB') */
  lang?: string
  /** Speech rate (0.1 to 10, default 1) */
  rate?: number
  /** Speech pitch (0 to 2, default 1) */
  pitch?: number
  /** Speech volume (0 to 1, default 1) */
  volume?: number
  /** Callback when speech starts */
  onStart?: () => void
  /** Callback when speech ends */
  onEnd?: () => void
  /** Callback on speech error */
  onError?: (error: string) => void
}

export interface UseTextToSpeechReturn {
  /** Speak the provided text */
  speak: (text: string) => void
  /** Stop current speech */
  stop: () => void
  /** Pause current speech */
  pause: () => void
  /** Resume paused speech */
  resume: () => void
  /** Check if browser supports text-to-speech */
  isSupported: boolean
  /** Check if currently speaking */
  isSpeaking: boolean
}

/**
 * Hook for text-to-speech functionality using Web Speech API.
 * Reads text aloud using the browser's native speech synthesis.
 */
export function useTextToSpeech(options?: TextToSpeechOptions): UseTextToSpeechReturn {
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window
  const isSpeaking = isSupported ? window.speechSynthesis.speaking : false

  const speak = useCallback((text: string) => {
    if (!isSupported) {
      console.warn('[TTS] Speech synthesis not supported in this browser')
      options?.onError?.('Speech synthesis not supported')
      return
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel()

    // Create new utterance
    const utterance = new SpeechSynthesisUtterance(text)
    utteranceRef.current = utterance

    // Configure voice settings
    utterance.lang = options?.lang || 'en-US'
    utterance.rate = options?.rate ?? 1
    utterance.pitch = options?.pitch ?? 1
    utterance.volume = options?.volume ?? 1

    // Event handlers
    utterance.onstart = () => {
      console.log('[TTS] Started speaking:', text.substring(0, 50))
      options?.onStart?.()
    }

    utterance.onend = () => {
      console.log('[TTS] Finished speaking')
      options?.onEnd?.()
    }

    utterance.onerror = (event) => {
      console.error('[TTS] Speech error:', event.error)
      options?.onError?.(event.error)
    }

    // Speak the text
    window.speechSynthesis.speak(utterance)
  }, [isSupported, options])

  const stop = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.cancel()
    }
  }, [isSupported])

  const pause = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.pause()
    }
  }, [isSupported])

  const resume = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.resume()
    }
  }, [isSupported])

  return {
    speak,
    stop,
    pause,
    resume,
    isSupported,
    isSpeaking,
  }
}
