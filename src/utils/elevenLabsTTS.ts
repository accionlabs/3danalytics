/**
 * ElevenLabs Text-to-Speech integration
 * API Documentation: https://elevenlabs.io/docs/api-reference/text-to-speech
 */

export interface ElevenLabsTTSOptions {
  /** Voice ID to use */
  voiceId?: string;
  /** Model ID to use (default: eleven_multilingual_v2) */
  modelId?: string;
  /** Stability (0.0 to 1.0) */
  stability?: number;
  /** Similarity boost (0.0 to 1.0) */
  similarityBoost?: number;
  /** Style (0.0 to 1.0) */
  style?: number;
  /** Use speaker boost */
  useSpeakerBoost?: boolean;
}

// Current audio element for playback control
let currentAudio: HTMLAudioElement | null = null;

/**
 * Convert text to speech using ElevenLabs API
 */
export async function elevenLabsSpeak(
  text: string,
  options?: ElevenLabsTTSOptions,
): Promise<void> {
  const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
  const voiceId = options?.voiceId || 'JBFqnCBsd6RMkjVDRZzb'; // Default voice
  const modelId = options?.modelId || 'eleven_multilingual_v2';

  if (!apiKey) {
    console.error(
      '[ElevenLabs TTS] API key not configured. Please set VITE_ELEVENLABS_API_KEY in .env',
    );
    throw new Error('ElevenLabs API key not configured');
  }

  // Stop any ongoing playback
  stopSpeaking();

  try {
    console.log(
      '[ElevenLabs TTS] Generating speech for:',
      text.substring(0, 100),
    );

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: modelId,
          voice_settings: {
            stability: options?.stability ?? 0.5,
            similarity_boost: options?.similarityBoost ?? 0.75,
            style: options?.style ?? 0.0,
            use_speaker_boost: options?.useSpeakerBoost ?? true,
          },
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ElevenLabs TTS] API error:', response.status, errorText);
      throw new Error(
        `ElevenLabs API error: ${response.status} - ${errorText}`,
      );
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);

    // Create and play audio element
    currentAudio = new Audio(audioUrl);

    currentAudio.onended = () => {
      console.log('[ElevenLabs TTS] ✓ Finished playing');
      URL.revokeObjectURL(audioUrl);
      currentAudio = null;
    };

    currentAudio.onerror = (error) => {
      console.error('[ElevenLabs TTS] ✗ Playback error:', error);
      URL.revokeObjectURL(audioUrl);
      currentAudio = null;
    };

    await currentAudio.play();
  } catch (error) {
    console.error('[ElevenLabs TTS] ✗ Error:', error);
    throw error;
  }
}

/**
 * Stop any ongoing speech playback
 */
export function stopSpeaking(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
    console.log('[ElevenLabs TTS] Stopped playback');
  }
}

/**
 * Pause ongoing speech playback
 */
export function pauseSpeaking(): void {
  if (currentAudio && !currentAudio.paused) {
    currentAudio.pause();
    console.log('[ElevenLabs TTS] Paused playback');
  }
}

/**
 * Resume paused speech playback
 */
export function resumeSpeaking(): void {
  if (currentAudio && currentAudio.paused) {
    currentAudio.play().catch((error) => {
      console.error('[ElevenLabs TTS] Resume error:', error);
    });
    console.log('[ElevenLabs TTS] Resumed playback');
  }
}

/**
 * Check if ElevenLabs TTS is configured and available
 */
export function isTTSSupported(): boolean {
  return !!import.meta.env.VITE_ELEVENLABS_API_KEY;
}

/**
 * Check if audio is currently playing
 */
export function isSpeaking(): boolean {
  return currentAudio !== null && !currentAudio.paused;
}
