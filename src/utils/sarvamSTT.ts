/**
 * Sarvam AI Speech-to-Text integration
 * API Documentation: https://docs.sarvam.ai/api-reference-docs/speech-to-text/convert
 */

export interface SarvamSTTOptions {
  /** Model to use (default: saaras:v3) */
  model?: string;
  /** Mode: 'transcribe', 'translate', 'verbatim', 'translit' */
  mode?: string;
  /** Language code if known */
  languageCode?: string;
}

/**
 * Convert speech to text using Sarvam AI API
 */
export async function sarvamTranscribe(
  audioBlob: Blob,
  options?: SarvamSTTOptions,
): Promise<string> {
  const apiKey = import.meta.env.VITE_SARVAM_API_KEY;

  if (!apiKey) {
    console.error('[Sarvam STT] API key not configured');
    throw new Error('Sarvam AI API key not configured');
  }

  try {
    const formData = new FormData();
    formData.append('file', audioBlob, 'record.webm');
    formData.append('model', options?.model || 'saaras:v3');

    if (options?.mode) {
      formData.append('mode', options.mode);
    }

    if (options?.languageCode) {
      formData.append('language_code', options.languageCode);
    }

    console.log('[Sarvam STT] Transcribing audio...');

    const response = await fetch('https://api.sarvam.ai/speech-to-text', {
      method: 'POST',
      headers: {
        'api-subscription-key': apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Sarvam STT] API error:', response.status, errorText);
      throw new Error(`Sarvam AI STT API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('[Sarvam STT] Transcription result:', data);

    return data.transcript || '';
  } catch (error) {
    console.error('[Sarvam STT] ✗ Error:', error);
    throw error;
  }
}
