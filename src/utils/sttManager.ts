import { sarvamTranscribe } from './sarvamSTT.ts';
import { elevenLabsTranscribe } from './elevenLabsSTT.ts';

export type STTProvider = 'sarvam' | 'elevenlabs' | 'whisper' | 'native';

/**
 * Get the current STT provider from environment variables
 */
export function getSTTProvider(): STTProvider {
  const provider = (import.meta.env.VITE_STT_PROVIDER as string) || 'native';
  return provider as STTProvider;
}

// Initial log to identify the service on load
console.log(
  `%c[STT Service] Active Provider: ${getSTTProvider()}`,
  'color: #3b82f6; font-weight: bold; font-size: 12px;',
);

/**
 * Transcribe audio blob using the configured provider
 */
export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const provider = getSTTProvider();
  console.log(`[STT Manager] 🎙️ Transcribing using: ${provider.toUpperCase()}`);

  switch (provider) {
    case 'sarvam':
      return sarvamTranscribe(audioBlob);
    case 'elevenlabs':
      return elevenLabsTranscribe(audioBlob);
    case 'native':
    case 'whisper':
    default:
      // These are handled within the hook currently, but we return empty here
      // if called directly. The manager primarily handles external API providers.
      console.warn(
        `[STT Manager] Provider ${provider} should be handled locally in useSpeechRecorder`,
      );
      return '';
  }
}
