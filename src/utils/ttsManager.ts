import {
  speakInsights as sarvamSpeakInsights,
  stopSpeaking as sarvamStop,
  pauseSpeaking as sarvamPause,
  resumeSpeaking as sarvamResume,
  isSpeaking as sarvamIsSpeaking,
} from './sarvamTTS.ts';
import {
  elevenLabsSpeak,
  stopSpeaking as elevenStop,
  pauseSpeaking as elevenPause,
  resumeSpeaking as elevenResume,
  isSpeaking as elevenIsSpeaking,
} from './elevenLabsTTS.ts';
import {
  speakInsights as webSpeakInsights,
  stopSpeaking as webStop,
  pauseSpeaking as webPause,
  resumeSpeaking as webResume,
} from './textToSpeech.ts';

export type TTSProvider = 'sarvam' | 'elevenlabs' | 'webspeech';

/**
 * Get the current TTS provider from environment variables
 */
export function getTTSProvider(): TTSProvider {
  const provider = import.meta.env.VITE_TTS_PROVIDER as string;
  if (provider === 'elevenlabs') return 'elevenlabs';
  if (provider === 'webspeech') return 'webspeech';
  return 'sarvam'; // Default to sarvam
}

/**
 * Speak an array of insights using the configured provider
 */
export async function speakInsights(insights: string[]): Promise<void> {
  const provider = getTTSProvider();
  console.log(`[TTS Manager] Using provider: ${provider}`);

  switch (provider) {
    case 'elevenlabs': {
      // ElevenLabs doesn't have a speakInsights helper yet, so we combine text here
      const intro = `I found ${insights.length} key insight${insights.length > 1 ? 's' : ''}.`;
      const fullText = intro + ' ' + insights.join('. ') + '.';
      return elevenLabsSpeak(fullText);
    }
    case 'webspeech':
      return webSpeakInsights(insights);
    case 'sarvam':
    default:
      return sarvamSpeakInsights(insights, {
        language: 'en-IN',
        speaker: 'sunny',
        speed: 1.2,
      });
  }
}

/**
 * Stop any ongoing speech
 */
export function stopSpeaking(): void {
  sarvamStop();
  elevenStop();
  webStop();
}

/**
 * Pause ongoing speech
 */
export function pauseSpeaking(): void {
  const provider = getTTSProvider();
  if (provider === 'sarvam') sarvamPause();
  else if (provider === 'elevenlabs') elevenPause();
  else if (provider === 'webspeech') webPause();
}

/**
 * Resume paused speech
 */
export function resumeSpeaking(): void {
  const provider = getTTSProvider();
  if (provider === 'sarvam') sarvamResume();
  else if (provider === 'elevenlabs') elevenResume();
  else if (provider === 'webspeech') webResume();
}

/**
 * Check if audio is currently playing
 */
export function isSpeaking(): boolean {
  return sarvamIsSpeaking() || elevenIsSpeaking();
  // webSpeech doesn't have a reliable isSpeaking check in the current utility,
  // but we mostly care about the API-based ones for now.
}
