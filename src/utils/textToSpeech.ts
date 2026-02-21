/**
 * Utility for text-to-speech using Web Speech API.
 * Can be used outside of React components (e.g., in Zustand stores).
 */

export interface SpeakOptions {
  /** Voice language (e.g., 'en-US', 'en-GB') */
  lang?: string
  /** Speech rate (0.1 to 10, default 1) */
  rate?: number
  /** Speech pitch (0 to 2, default 1) */
  pitch?: number
  /** Speech volume (0 to 1, default 1) */
  volume?: number
}

/**
 * Select the best available voice for natural-sounding speech.
 * Prefers premium/natural voices over default ones.
 */
function selectBestVoice(lang: string = 'en-US'): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return null
  }

  const voices = window.speechSynthesis.getVoices()

  if (voices.length === 0) {
    return null
  }

  // Priority order for selecting the best voice:
  // 1. Google premium voices (natural sounding)
  // 2. Microsoft voices (good quality)
  // 3. Apple enhanced voices
  // 4. Any local voice matching language
  // 5. Any voice matching language
  // 6. Default voice

  const langPrefix = lang.split('-')[0] // 'en' from 'en-US'

  // Try to find premium/natural voices first
  const premiumVoiceNames = [
    'Google US English',
    'Google UK English Female',
    'Google UK English Male',
    'Microsoft Zira',
    'Microsoft David',
    'Samantha',
    'Karen',
    'Daniel',
    'Moira',
    'Tessa',
  ]

  // 1. Look for premium voices
  for (const voiceName of premiumVoiceNames) {
    const voice = voices.find(v =>
      v.name.includes(voiceName) && v.lang.startsWith(langPrefix)
    )
    if (voice) {
      console.log('[TTS] Selected premium voice:', voice.name)
      return voice
    }
  }

  // 2. Look for any local voice (usually better quality)
  const localVoice = voices.find(v =>
    v.lang === lang && v.localService
  )
  if (localVoice) {
    console.log('[TTS] Selected local voice:', localVoice.name)
    return localVoice
  }

  // 3. Look for any voice matching exact language
  const langVoice = voices.find(v => v.lang === lang)
  if (langVoice) {
    console.log('[TTS] Selected language voice:', langVoice.name)
    return langVoice
  }

  // 4. Look for any voice matching language prefix
  const prefixVoice = voices.find(v => v.lang.startsWith(langPrefix))
  if (prefixVoice) {
    console.log('[TTS] Selected prefix voice:', prefixVoice.name)
    return prefixVoice
  }

  // 5. Fall back to first voice
  console.log('[TTS] Using default voice:', voices[0].name)
  return voices[0]
}

/**
 * Speak text using browser's text-to-speech.
 * Automatically selects the best available voice for natural sound.
 */
export function speak(text: string, options?: SpeakOptions): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('[TTS] Speech synthesis not supported')
    return
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel()

  // Create utterance
  const utterance = new SpeechSynthesisUtterance(text)

  // Configure voice settings
  const lang = options?.lang || 'en-US'
  utterance.lang = lang
  utterance.rate = options?.rate ?? 0.92 // Slightly slower for natural clarity
  utterance.pitch = options?.pitch ?? 1.0
  utterance.volume = options?.volume ?? 0.9

  // Select best available voice
  const bestVoice = selectBestVoice(lang)
  if (bestVoice) {
    utterance.voice = bestVoice
  }

  // Event handlers
  utterance.onstart = () => {
    console.log('[TTS] Speaking:', text.substring(0, 100))
  }

  utterance.onend = () => {
    console.log('[TTS] Finished')
  }

  utterance.onerror = (event) => {
    console.error('[TTS] Error:', event.error)
  }

  // Speak
  window.speechSynthesis.speak(utterance)
}

/**
 * Speak an array of insights sequentially with pauses between each.
 */
export function speakInsights(insights: string[], options?: SpeakOptions): void {
  if (!insights || insights.length === 0) {
    console.log('[TTS] No insights to speak')
    return
  }

  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('[TTS] Speech synthesis not supported')
    return
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel()

  // Create introduction
  const intro = `I found ${insights.length} key insight${insights.length > 1 ? 's' : ''}.`

  // Combine intro with insights
  const fullText = intro + ' ' + insights.join('. ') + '.'

  speak(fullText, options)
}

/**
 * Stop any ongoing speech.
 */
export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel()
  }
}

/**
 * Pause ongoing speech.
 */
export function pauseSpeaking(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.pause()
  }
}

/**
 * Resume paused speech.
 */
export function resumeSpeaking(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.resume()
  }
}

/**
 * Check if text-to-speech is supported.
 */
export function isTTSSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}
