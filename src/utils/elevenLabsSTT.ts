/**
 * ElevenLabs Speech-to-Text integration (Scribe)
 * API Documentation: https://elevenlabs.io/docs/api-reference/speech-to-text
 */

export interface ElevenLabsSTTOptions {
  /** Model ID (default: scribe_v1) */
  modelId?: string;
  /** Language code (e.g., 'en') */
  languageCode?: string;
  /** Enable diarization */
  diarize?: boolean;
}

/**
 * Convert speech to text using ElevenLabs Scribe API
 */
export async function elevenLabsTranscribe(
  audioBlob: Blob,
  options?: ElevenLabsSTTOptions,
): Promise<string> {
  const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;

  if (!apiKey) {
    console.error('[ElevenLabs STT] API key not configured');
    throw new Error('ElevenLabs API key not configured');
  }

  try {
    const formData = new FormData();
    formData.append('file', audioBlob, 'record.webm');
    formData.append('model_id', options?.modelId || 'scribe_v1');

    if (options?.languageCode) {
      formData.append('language_code', options.languageCode);
    }

    if (options?.diarize) {
      formData.append('diarize', 'true');
    }

    console.log('[ElevenLabs STT] Transcribing audio...');

    const response = await fetch(
      'https://api.elevenlabs.io/v1/speech-to-text',
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
        },
        body: formData,
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ElevenLabs STT] API error:', response.status, errorText);
      throw new Error(`ElevenLabs STT API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('[ElevenLabs STT] Transcription result:', data);

    // ElevenLabs response structure for transcribe usually contains 'text'
    return data.text || '';
  } catch (error) {
    console.error('[ElevenLabs STT] ✗ Error:', error);
    throw error;
  }
}
