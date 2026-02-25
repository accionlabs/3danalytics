import { useRef, useState, useCallback } from 'react';
import { transcribeAudio, getSTTProvider } from '../utils/sttManager.ts';

export type RecordingState = 'idle' | 'recording' | 'processing';
export type STTProvider = 'native' | 'whisper' | 'sarvam' | 'elevenlabs';

export interface UseSpeechRecorderReturn {
  state: RecordingState;
  transcript: string;
  /** Current STT provider being used */
  provider: STTProvider;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  clearTranscript: () => void;
}

export interface UseSpeechRecorderOptions {
  /**
   * Force a specific provider, overriding env settings.
   */
  provider?: STTProvider;
}

// ─── Backend detection ─────────────────────────────────────────────────────
// Web Speech API is available on Chrome, Edge, and Safari.
// It transcribes natively (< 1 s) with no model download.
// Firefox and non-Chromium browsers fall back to Whisper over WASM.

const NativeSpeechRecognition: (new () => SpeechRecognition) | undefined =
  typeof window !== 'undefined'
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((window as any).SpeechRecognition ??
      (window as any).webkitSpeechRecognition)
    : undefined;

// ─── Whisper pipeline (WASM fallback) ─────────────────────────────────────

let transcriberPromise: Promise<unknown> | null = null;

async function getTranscriber() {
  if (!transcriberPromise) {
    const { pipeline } = await import('@huggingface/transformers');
    transcriberPromise = pipeline(
      'automatic-speech-recognition',
      'Xenova/whisper-tiny.en',
    ).catch((err) => {
      transcriberPromise = null;
      throw err;
    });
  }
  return transcriberPromise;
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${label} timed out after ${ms / 1000}s`)),
        ms,
      ),
    ),
  ]);
}

// ─── Audio helpers (Whisper path only) ────────────────────────────────────

async function blobToFloat32At16k(blob: Blob): Promise<Float32Array> {
  const arrayBuffer = await blob.arrayBuffer();
  const decodeCtx = new AudioContext();
  const audioBuffer = await decodeCtx.decodeAudioData(arrayBuffer);
  await decodeCtx.close();

  // If the browser honoured the 16 kHz sampleRate constraint we skip resampling
  if (audioBuffer.sampleRate === 16000) return audioBuffer.getChannelData(0);

  const targetLen = Math.ceil(audioBuffer.duration * 16000);
  const offlineCtx = new OfflineAudioContext(1, targetLen, 16000);
  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineCtx.destination);
  source.start(0);
  const resampled = await offlineCtx.startRendering();
  return resampled.getChannelData(0);
}

function padWithSilence(data: Float32Array, sr = 16000): Float32Array {
  const pre = Math.round(0.25 * sr);
  const post = Math.round(0.5 * sr);
  const padded = new Float32Array(pre + data.length + post); // zero-filled
  padded.set(data, pre);
  return padded;
}

// ─── Hook ──────────────────────────────────────────────────────────────────

export function useSpeechRecorder(
  options?: UseSpeechRecorderOptions,
): UseSpeechRecorderReturn {
  const [state, setState] = useState<RecordingState>('idle');
  const [transcript, setTranscript] = useState('');

  // Native path refs
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const nativeTranscriptRef = useRef('');

  // Recorder path refs (API or Whisper)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const currentProvider = options?.provider || getSTTProvider();

  // ── Native: Web Speech API (Chrome / Edge / Safari) ─────────────────────
  const startNative = useCallback(() => {
    if (!NativeSpeechRecognition) return;
    const recognition = new NativeSpeechRecognition();
    recognitionRef.current = recognition;
    nativeTranscriptRef.current = '';

    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      nativeTranscriptRef.current = Array.from(event.results)
        .map((r: SpeechRecognitionResult) => r[0].transcript)
        .join(' ')
        .trim();
    };

    recognition.onend = () => {
      setTranscript(nativeTranscriptRef.current);
      setState('idle');
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('[SpeechRecorder] Native STT error:', event.error);
      setState('idle');
    };

    recognition.start();
    console.log(
      '[SpeechRecorder] 🎙️ Started recording using: NATIVE (Web Speech API)',
    );
    setState('recording');
  }, []);

  const stopNative = useCallback(() => {
    setState('processing');
    recognitionRef.current?.stop();
  }, []);

  // ── Recorder Path (API or Whisper) ─────────────────────────────
  const startRecorder = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.start(250);
      console.log(
        `[SpeechRecorder] 🎙️ Started recording using: ${currentProvider.toUpperCase()}`,
      );
      setState('recording');

      if (currentProvider === 'whisper') {
        getTranscriber().catch(() => {});
      }
    } catch (err) {
      console.error('[SpeechRecorder] Failed to start recording:', err);
    }
  }, [currentProvider]);

  const stopRecorder = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;

    recorder.onstop = async () => {
      setState('processing');
      recorder.stream.getTracks().forEach((t) => t.stop());

      try {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });

        if (currentProvider === 'sarvam' || currentProvider === 'elevenlabs') {
          // Use API provider
          const text = await transcribeAudio(blob);
          setTranscript(text);
        } else {
          // Fallback to local Whisper
          const raw = await blobToFloat32At16k(blob);
          const padded = padWithSilence(raw);
          const transcriber = (await getTranscriber()) as (
            data: Float32Array,
            opts: { sampling_rate: number },
          ) => Promise<{ text: string }>;

          const result = await withTimeout(
            transcriber(padded, { sampling_rate: 16000 }),
            60_000,
            'Transcription',
          );
          setTranscript(result.text?.trim() ?? '');
        }
      } catch (err) {
        console.error('[SpeechRecorder] Transcription failed:', err);
        setTranscript('[Transcription failed — check console for details]');
      } finally {
        setState('idle');
      }
    };

    recorder.stop();
  }, [currentProvider]);

  // ── Public API ───────────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    if (currentProvider === 'native') startNative();
    else await startRecorder();
  }, [currentProvider, startNative, startRecorder]);

  const stopRecording = useCallback(() => {
    if (currentProvider === 'native') stopNative();
    else stopRecorder();
  }, [currentProvider, stopNative, stopRecorder]);

  const clearTranscript = useCallback(() => setTranscript(''), []);

  return {
    state,
    transcript,
    provider: currentProvider,
    startRecording,
    stopRecording,
    clearTranscript,
  };
}
