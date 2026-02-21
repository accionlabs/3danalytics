/**
 * Sarvam AI Text-to-Speech integration
 * API Documentation: https://docs.sarvam.ai/api-reference-docs/text-to-speech/convert
 */

export interface SarvamTTSOptions {
  /** Language code (e.g., 'en-IN', 'hi-IN') */
  language?: string
  /** Voice speaker - valid options: 'anushka', 'abhilash', 'manisha', 'vidya', 'priya', etc. */
  speaker?: string
  /** Speech rate/speed (0.25 to 3.0, default 1.0) */
  speed?: number
  /** Audio pitch - NOTE: Not supported in Bulbul V3 model */
  pitch?: number
  /** Enable word-level timestamps */
  enableTimestamps?: boolean
}

// Current audio element for playback control
let currentAudio: HTMLAudioElement | null = null

/**
 * Convert text to speech using Sarvam AI API
 */
export async function sarvamSpeak(
  text: string,
  options?: SarvamTTSOptions
): Promise<void> {
  const apiKey = import.meta.env.VITE_SARVAM_API_KEY

  if (!apiKey || apiKey === 'your_sarvam_api_key_here') {
    console.error('[Sarvam TTS] API key not configured. Please set VITE_SARVAM_API_KEY in .env')
    throw new Error('Sarvam AI API key not configured')
  }

  // Stop any ongoing playback
  stopSpeaking()

  try {
    console.log('[Sarvam TTS] Generating speech for:', text.substring(0, 100))
    console.log('[Sarvam TTS] Using API key:', apiKey.substring(0, 10) + '...')

    const requestBody = {
      inputs: [text],
      target_language_code: options?.language || 'en-IN',
      speaker: options?.speaker || 'priya', // Natural-sounding female voice
      pace: options?.speed ?? 1.0,
      speech_sample_rate: 8000,
      enable_preprocessing: true,
      model: 'bulbul:v3', // Latest Sarvam AI model (v3 doesn't support pitch/loudness)
    }

    console.log('[Sarvam TTS] Request body:', requestBody)

    const response = await fetch('https://api.sarvam.ai/text-to-speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-subscription-key': apiKey,
      },
      body: JSON.stringify(requestBody),
    })

    console.log('[Sarvam TTS] Response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Sarvam TTS] API error:', response.status, errorText)
      throw new Error(`Sarvam AI API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    console.log('[Sarvam TTS] Response data:', data)

    if (!data.audios || data.audios.length === 0) {
      console.error('[Sarvam TTS] No audio data in response:', data)
      throw new Error('No audio data received from Sarvam AI')
    }

    // Get base64 audio data
    const base64Audio = data.audios[0]
    console.log('[Sarvam TTS] Received base64 audio, length:', base64Audio.length)

    // Convert base64 to blob
    const audioBlob = base64ToBlob(base64Audio, 'audio/wav')
    console.log('[Sarvam TTS] Created audio blob, size:', audioBlob.size)

    const audioUrl = URL.createObjectURL(audioBlob)
    console.log('[Sarvam TTS] Created audio URL:', audioUrl)

    // Create and play audio element
    currentAudio = new Audio(audioUrl)

    currentAudio.onplay = () => {
      console.log('[Sarvam TTS] ✓ Playing audio')
    }

    currentAudio.onended = () => {
      console.log('[Sarvam TTS] ✓ Finished playing')
      URL.revokeObjectURL(audioUrl)
      currentAudio = null
    }

    currentAudio.onerror = (error) => {
      console.error('[Sarvam TTS] ✗ Playback error:', error)
      URL.revokeObjectURL(audioUrl)
      currentAudio = null
    }

    console.log('[Sarvam TTS] Starting playback...')
    await currentAudio.play()
  } catch (error) {
    console.error('[Sarvam TTS] ✗ Error:', error)
    throw error
  }
}

/**
 * Speak an array of insights sequentially using Sarvam AI
 */
export async function speakInsights(
  insights: string[],
  options?: SarvamTTSOptions
): Promise<void> {
  if (!insights || insights.length === 0) {
    console.log('[Sarvam TTS] No insights to speak')
    return
  }

  // Create introduction and combine with insights
  const intro = `I found ${insights.length} key insight${insights.length > 1 ? 's' : ''}.`
  const fullText = intro + ' ' + insights.join('. ') + '.'

  await sarvamSpeak(fullText, options)
}

/**
 * Stop any ongoing speech playback
 */
export function stopSpeaking(): void {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.currentTime = 0
    currentAudio = null
    console.log('[Sarvam TTS] Stopped playback')
  }
}

/**
 * Pause ongoing speech playback
 */
export function pauseSpeaking(): void {
  if (currentAudio && !currentAudio.paused) {
    currentAudio.pause()
    console.log('[Sarvam TTS] Paused playback')
  }
}

/**
 * Resume paused speech playback
 */
export function resumeSpeaking(): void {
  if (currentAudio && currentAudio.paused) {
    currentAudio.play().catch((error) => {
      console.error('[Sarvam TTS] Resume error:', error)
    })
    console.log('[Sarvam TTS] Resumed playback')
  }
}

/**
 * Check if Sarvam AI TTS is configured and available
 */
export function isTTSSupported(): boolean {
  const apiKey = import.meta.env.VITE_SARVAM_API_KEY
  return !!apiKey && apiKey !== 'your_sarvam_api_key_here'
}

/**
 * Check if audio is currently playing
 */
export function isSpeaking(): boolean {
  return currentAudio !== null && !currentAudio.paused
}

/**
 * Convert base64 string to Blob
 */
function base64ToBlob(base64: string, contentType: string): Blob {
  const byteCharacters = atob(base64)
  const byteArrays: BlobPart[] = []

  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512)
    const byteNumbers = new Array(slice.length)

    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i)
    }

    const byteArray = new Uint8Array(byteNumbers)
    byteArrays.push(byteArray)
  }

  return new Blob(byteArrays, { type: contentType })
}
